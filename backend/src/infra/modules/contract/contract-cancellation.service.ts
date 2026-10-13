import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {and,desc,eq,sql} from 'drizzle-orm';
import {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {DRIZZLE} from '../../persistence/database.module';
import {ContractSchema} from '../../persistence/schemas/contract-schema';
import {ContractRevisionSchema} from '../../persistence/schemas/contract-revision-schema';
import {ContractCancellationSchema} from '../../persistence/schemas/contract-cancellation-schema';
import {ContractAuditEventSchema} from '../../persistence/schemas/contract-security-schema';
import {RentalSchema} from '../../persistence/schemas/rental-schema';
import {RentalInstallmentSchema} from '../../persistence/schemas/rental-installment-schema';
import {PropertyContractSettingsSchema} from '../../persistence/schemas/property-contract-settings-schema';
import {canCancelBeforeCheckIn} from '../../../core/domain/contract/cancellation-cutoff';

type Db=NodePgDatabase;
type Tx=Parameters<Parameters<Db['transaction']>[0]>[0];
function cents(amount:number):number{
 const value=amount*100;
 if(!Number.isFinite(value)||Math.abs(value)>10_000_000_000||
  Math.abs(value-Math.round(value))>0.000001)
  throw new ConflictException('Invalid stored booking amount');
 return Math.round(value);
}
function cancellationToken(uid:string,payload:unknown):string{
 const raw=process.env.CONTRACT_DATA_KEYS,active=process.env.CONTRACT_ACTIVE_KEY_VERSION;
 if(!raw||!active)throw new Error('Contract key not configured');
 const value=(JSON.parse(raw) as Record<string,string>)[active];
 if(!value)throw new Error('Active contract key missing');
 return createHmac('sha256',Buffer.from(value,'base64')).update('rentalflow-cancellation-v1:')
  .update(uid).update(':').update(JSON.stringify(payload)).digest('hex');
}
@Injectable()
export class ContractCancellationService{
 constructor(@Inject(DRIZZLE) private readonly db:Db){}
 private async load(tx:Tx,uid:string,id:string){
  const [contract]=await tx.select().from(ContractSchema).where(and(
   eq(ContractSchema.id,id),eq(ContractSchema.userId,uid))).limit(1);
  if(!contract)throw new NotFoundException('Contract not found');
  const [rental]=await tx.select().from(RentalSchema).where(and(
   eq(RentalSchema.id,contract.rentalId),eq(RentalSchema.userId,uid))).limit(1);
  if(!rental)throw new NotFoundException('Contract not found');
  if(!rental.isActive)throw new ConflictException('Booking was already cancelled');
  const [propertyRules]=await tx.select({checkInTime:PropertyContractSettingsSchema.checkInTime})
   .from(PropertyContractSettingsSchema).where(and(
    eq(PropertyContractSettingsSchema.propertyId,rental.propertyId),
    eq(PropertyContractSettingsSchema.userId,uid))).limit(1);
  if(!canCancelBeforeCheckIn(rental.startDate,propertyRules?.checkInTime))
   throw new ConflictException('Cancellation is unavailable after check-in or when check-in time is missing');
  const [revision]=await tx.select({id:ContractRevisionSchema.id,status:ContractRevisionSchema.status,
   version:ContractRevisionSchema.versionNumber}).from(ContractRevisionSchema).where(and(
   eq(ContractRevisionSchema.contractId,id),eq(ContractRevisionSchema.userId,uid)))
   .orderBy(desc(ContractRevisionSchema.versionNumber)).limit(1);
  if(!revision)throw new ConflictException('Contract revision missing');
  const payments=await tx.select({
   id:RentalInstallmentSchema.id,sequence:RentalInstallmentSchema.sequence,
   agreedCents:RentalInstallmentSchema.agreedCents,
   receivedCents:RentalInstallmentSchema.receivedCents,paidAt:RentalInstallmentSchema.paidAt
  }).from(RentalInstallmentSchema).where(and(
   eq(RentalInstallmentSchema.rentalId,rental.id),eq(RentalInstallmentSchema.userId,uid)))
   .orderBy(RentalInstallmentSchema.sequence);
  const revenueCents=cents(rental.revenue),profitCents=cents(rental.profit);
  const recordedReceivedCents=payments.reduce((a,p)=>a+p.receivedCents,0);
  const snapshot={contractId:contract.id,rentalId:rental.id,revision,
   propertyId:rental.propertyId,startDate:rental.startDate,endDate:rental.endDate,
   guests:rental.guests,firstName:rental.clientFirstName,lastName:rental.clientLastName,
   revenueCents,profitCents,feeCents:cents(rental.fee),active:rental.isActive,
   payments:payments.map(p=>[p.id,p.sequence,p.agreedCents,p.receivedCents,p.paidAt?.toISOString()??null])};
  return {contract,rental,revision,revenueCents,profitCents,recordedReceivedCents,snapshot};
 }
 async review(uid:string,id:string){
  if(!uid)throw new NotFoundException();
  return this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}),hashtext(${id}))`);
   const p=await this.load(tx,uid,id);
   return {ready:true,reviewToken:cancellationToken(uid,p.snapshot),
    contractId:id,revisionId:p.revision.id,revisionStatus:p.revision.status,
    startDate:p.rental.startDate,endDate:p.rental.endDate,
    revenueExcludedCents:p.revenueCents,profitExcludedCents:p.profitCents,
    recordedReceivedCents:p.recordedReceivedCents,refundIssued:false};
  });
 }
 async cancel(uid:string,id:string,token:string,confirm:boolean){
  if(!uid)throw new NotFoundException();
  if(confirm!==true)throw new BadRequestException('Explicit confirmation required');
  if(!/^[a-f0-9]{64}$/.test(token))throw new BadRequestException('Invalid cancellation review token');
  return this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}),hashtext(${id}))`);
   const p=await this.load(tx,uid,id);
   const expected=cancellationToken(uid,p.snapshot);
   if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(token,'hex')))
    throw new ConflictException('Booking or receipts changed; review cancellation again');
   await tx.execute(sql`SELECT id FROM rentals WHERE id=${p.rental.id} AND user_id=${uid} FOR UPDATE`);
   await tx.execute(sql`SELECT id FROM rental_installments WHERE rental_id=${p.rental.id} AND user_id=${uid} ORDER BY sequence FOR UPDATE`);
   const verified=await this.load(tx,uid,id);
   if(cancellationToken(uid,verified.snapshot)!==expected)
    throw new ConflictException('Booking changed during cancellation');
   await tx.insert(ContractCancellationSchema).values({
    contractId:id,rentalId:p.rental.id,userId:uid,actorId:uid,
    transactionId:sql.raw('txid_current()'),
    excludedRevenueCents:p.revenueCents,excludedProfitCents:p.profitCents
   });
   const [changed]=await tx.update(RentalSchema).set({isActive:false})
    .where(and(eq(RentalSchema.id,p.rental.id),eq(RentalSchema.userId,uid),eq(RentalSchema.isActive,true)))
    .returning({id:RentalSchema.id});
   if(!changed)throw new ConflictException('Booking already cancelled');
   await tx.insert(ContractAuditEventSchema).values({
    userId:uid,actorId:uid,action:'CANCEL_CONTRACT_BOOKING',targetType:'CONTRACT',
    targetId:id,outcome:'SUCCESS'
   });
   return {cancelled:true,contractId:id,rentalId:changed.id,
    revenueExcludedCents:p.revenueCents,profitExcludedCents:p.profitCents,
    recordedReceivedCents:p.recordedReceivedCents,refundIssued:false};
  });
 }
}
