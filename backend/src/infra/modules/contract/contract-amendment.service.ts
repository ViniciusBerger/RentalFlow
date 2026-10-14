import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {and,desc,eq,sql} from 'drizzle-orm';
import {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {DRIZZLE} from '../../persistence/database.module';
import {ContractSchema} from '../../persistence/schemas/contract-schema';
import {ContractRevisionSchema} from '../../persistence/schemas/contract-revision-schema';
import {ContractAmendmentSchema,type AmendmentFacts} from '../../persistence/schemas/contract-amendment-schema';
import {ContractAuditEventSchema} from '../../persistence/schemas/contract-security-schema';
import {ContractSettingsSchema} from '../../persistence/schemas/contract-settings-schema';
import {RentalSchema} from '../../persistence/schemas/rental-schema';
import {RentalInstallmentSchema} from '../../persistence/schemas/rental-installment-schema';
import {PropertySchema} from '../../persistence/schemas/property-schema';
import {PropertyContractSettingsSchema} from '../../persistence/schemas/property-contract-settings-schema';
import {ContractDataCrypto} from '../../security/encrypted-data';
import {ContractAmendmentProposalDto} from '../../../web/dto-web/contract/contract-amendment.dto';
import {canCancelBeforeCheckIn} from '../../../core/domain/contract/cancellation-cutoff';
import {checkedNights} from './contract-booking.service';
import {rentalCharge,verifyInstallments,type GuestFeeChoice} from '../../../core/domain/contract/contract-validation';

type Tx=Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];
const cents=(v:number)=>{const n=v*100;
 if(!Number.isFinite(n)||Math.abs(n-Math.round(n))>0.000001)
  throw new ConflictException('Invalid existing booking amounts');
 return Math.round(n);
};
const facts=(r:typeof RentalSchema.$inferSelect):AmendmentFacts=>({
 propertyId:r.propertyId,startDate:r.startDate,endDate:r.endDate,guests:r.guests,
 revenueCents:cents(r.revenue),feeCents:cents(r.fee),profitCents:cents(r.profit)});
const token=(uid:string,payload:unknown)=>{
 const raw=process.env.CONTRACT_DATA_KEYS,active=process.env.CONTRACT_ACTIVE_KEY_VERSION;
 if(!raw||!active)throw new Error('Contract key missing');
 const key=(JSON.parse(raw) as Record<string,string>)[active];
 if(!key)throw new Error('Active contract key missing');
 return createHmac('sha256',Buffer.from(key,'base64')).update('rentalflow-amendment-v1:')
  .update(uid).update(':').update(JSON.stringify(payload)).digest('hex');
};
const planned=(list:ContractAmendmentProposalDto['installments'])=>list?.map((p,i)=>({
 sequence:i+1,agreedCents:p.agreedCents,dueDate:p.dueDate??null,
 dueEvent:p.dueEvent??null,paymentMethod:p.paymentMethod??null,isDeposit:p.isDeposit??false}))??null;
@Injectable()
export class ContractAmendmentService{
 constructor(@Inject(DRIZZLE)private readonly db:NodePgDatabase){}
 private async load(tx:Tx,uid:string,id:string,p:ContractAmendmentProposalDto){
  const [contract]=await tx.select().from(ContractSchema).where(and(eq(ContractSchema.id,id),eq(ContractSchema.userId,uid))).limit(1);
  if(!contract)throw new NotFoundException('Contract not found');
  const [rental]=await tx.select().from(RentalSchema).where(and(eq(RentalSchema.id,contract.rentalId),eq(RentalSchema.userId,uid))).limit(1);
  if(!rental||!rental.isActive)throw new ConflictException('Booking is inactive');
  const [oldRules]=await tx.select().from(PropertyContractSettingsSchema).where(and(
   eq(PropertyContractSettingsSchema.propertyId,rental.propertyId),eq(PropertyContractSettingsSchema.userId,uid))).limit(1);
  if(!canCancelBeforeCheckIn(rental.startDate,oldRules?.checkInTime))
   throw new ConflictException('Retroactive amendments require a separate approved policy');
  const [previous]=await tx.select().from(ContractRevisionSchema).where(and(
   eq(ContractRevisionSchema.contractId,id),eq(ContractRevisionSchema.userId,uid)))
   .orderBy(desc(ContractRevisionSchema.versionNumber)).limit(1);
  if(!previous||previous.status!=='FINALIZED')
   throw new ConflictException('Finalize the current contract before amending');
  const [property]=await tx.select().from(PropertySchema).where(and(eq(PropertySchema.id,p.propertyId),
   eq(PropertySchema.userId,uid),eq(PropertySchema.isActive,true))).limit(1);
  if(!property)throw new NotFoundException('Selected property not found');
  const [rules]=await tx.select().from(PropertyContractSettingsSchema).where(and(
   eq(PropertyContractSettingsSchema.propertyId,property.id),eq(PropertyContractSettingsSchema.userId,uid))).limit(1);
  if(!rules||rules.includedOccupancy===null||rules.maximumOccupancy===null||
   rules.extraGuestRateCents===null)throw new ConflictException('Property occupancy settings missing');
  const choice:GuestFeeChoice=p.guestFee?.mode==='WAIVED'
   ?{mode:'WAIVED',reason:p.guestFee.reason??''}
   :p.guestFee?.mode==='ADJUSTED'
    ?{mode:'ADJUSTED',cents:p.guestFee.cents!,reason:p.guestFee.reason??''}
    :{mode:'AUTOMATIC'};
  if(p.guestFee?.mode==='AUTOMATIC'&&(p.guestFee.cents!==undefined||p.guestFee.reason!==undefined))
   throw new BadRequestException('Automatic surcharge cannot accept override fields');
  let price;
  try{price=rentalCharge(p.baseRevenueCents,p.guests,checkedNights(p.startDate,p.endDate),{
   included:rules.includedOccupancy,maximum:rules.maximumOccupancy,
   extraRateCents:rules.extraGuestRateCents},choice,true);}
  catch{throw new BadRequestException('Invalid dates, occupancy, price or surcharge override');}
  const before=facts(rental),after:AmendmentFacts={propertyId:property.id,
   startDate:p.startDate,endDate:p.endDate,guests:p.guests,
   revenueCents:price.totalCents,feeCents:before.feeCents,profitCents:price.totalCents-before.feeCents};
  if(JSON.stringify(before)===JSON.stringify(after))throw new BadRequestException('No booking terms changed');
  const payments=await tx.select().from(RentalInstallmentSchema).where(and(
   eq(RentalInstallmentSchema.rentalId,rental.id),eq(RentalInstallmentSchema.userId,uid)))
   .orderBy(RentalInstallmentSchema.sequence);
  const proposed=planned(p.installments);
  if(proposed){
   try{verifyInstallments(after.revenueCents,proposed.map(x=>x.agreedCents));}
   catch{throw new BadRequestException('Installments must equal amended booking total');}
   if(proposed.filter(x=>x.isDeposit).length>1)throw new BadRequestException('Only one deposit is permitted');
   const [setting]=await tx.select().from(ContractSettingsSchema).where(eq(ContractSettingsSchema.userId,uid)).limit(1);
   const accepted=(setting?.paymentDefaults as {acceptedMethods?:string[]}|undefined)?.acceptedMethods??[];
   for(const x of proposed){
    if(x.dueDate&&x.dueEvent)throw new BadRequestException('Conflicting due rules');
    if(x.dueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(x.dueDate)||Number.isNaN(Date.parse(x.dueDate))||
      new Date(x.dueDate).toISOString().slice(0,10)!==x.dueDate))
     throw new BadRequestException('Invalid installment due date');
    if(x.paymentMethod&&(!accepted.length||!accepted.includes(x.paymentMethod)))
     throw new BadRequestException('Unapproved payment method');
   }
  }
  const current=payments.map(x=>({sequence:x.sequence,agreedCents:x.agreedCents,dueDate:x.dueDate,
   dueEvent:x.dueEvent,paymentMethod:x.paymentMethod,isDeposit:x.isDeposit}));
  const paymentChanged=!!proposed&&JSON.stringify(current)!==JSON.stringify(proposed);
  if(before.revenueCents!==after.revenueCents&&!paymentChanged)
   throw new BadRequestException('An explicit new installment schedule is required for a new total');
  if(paymentChanged&&payments.some(x=>x.receivedCents>0||x.paidAt))
   throw new ConflictException('Recorded payments require separate reconciliation');
  const scope={id,revision:previous.id,version:previous.versionNumber,before,after,
   checkIn:oldRules?.checkInTime,policy:[rules.includedOccupancy,rules.maximumOccupancy,rules.extraGuestRateCents],
   price,baseRevenueCents:p.baseRevenueCents,choice,
   payments:payments.map(x=>[x.id,x.sequence,x.agreedCents,x.receivedCents,x.paidAt?.toISOString()??null,
    x.dueDate,x.dueEvent,x.paymentMethod,x.isDeposit]),proposed,paymentChanged};
  return {contract,rental,previous,before,after,payments,proposed,paymentChanged,scope,price,choice};
 }
 async review(uid:string,id:string,p:ContractAmendmentProposalDto){
  if(!uid)throw new NotFoundException();
  return this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}),hashtext(${id}))`);
   const state=await this.load(tx,uid,id,p);
   return {ready:true,reviewToken:token(uid,state.scope),before:state.before,after:state.after,
    pricing:{...state.price,baseRevenueCents:p.baseRevenueCents},
    paymentChanged:state.paymentChanged,recordedPayments:state.payments.filter(x=>x.receivedCents>0||x.paidAt).length,
    unsignedAmendmentRequired:true};
  });
 }
 async approve(uid:string,id:string,p:ContractAmendmentProposalDto,reviewToken:string,confirm:boolean){
  if(!uid)throw new NotFoundException();
  if(confirm!==true||!/^[a-f0-9]{64}$/.test(reviewToken))
   throw new BadRequestException('Explicit landlord approval and valid token required');
  try{return await this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}),hashtext(${id}))`);
   const initial=await this.load(tx,uid,id,p);
   const expected=token(uid,initial.scope);
   if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(reviewToken,'hex')))
    throw new ConflictException('Booking or pricing changed; review amendment again');
   await tx.execute(sql`SELECT id FROM rentals WHERE id=${initial.rental.id} AND user_id=${uid} FOR UPDATE`);
   await tx.execute(sql`SELECT id FROM rental_installments WHERE rental_id=${initial.rental.id} AND user_id=${uid} ORDER BY sequence FOR UPDATE`);
   const state=await this.load(tx,uid,id,p);
   if(token(uid,state.scope)!==expected)throw new ConflictException('Booking changed during amendment');
   const revisionId=randomUUID();
   const meta=new ContractDataCrypto().seal(Buffer.from(JSON.stringify({
    kind:'LANDLORD_APPROVED_AMENDMENT',isFinal:false,fromRevisionId:state.previous.id,
    before:state.before,after:state.after,baseRevenueCents:p.baseRevenueCents,
    calculatedExtraCents:state.price.calculatedExtraCents,
    chargedExtraCents:state.price.chargedExtraCents,guestFeeMode:state.choice.mode,
    guestFeeReason:state.choice.mode==='AUTOMATIC'?null:state.choice.reason,approvedBy:uid
   }),'utf8'),uid,'contract-snapshot',revisionId);
   await tx.insert(ContractRevisionSchema).values({
    id:revisionId,userId:uid,contractId:id,versionNumber:state.previous.versionNumber+1,
    status:'DRAFT',templateVersionId:state.previous.templateVersionId,
    snapshotCiphertext:meta.ciphertext,snapshotNonce:meta.nonce,
    snapshotAuthTag:meta.authTag,snapshotKeyVersion:meta.keyVersion,snapshotSha256:meta.sha256
   });
   await tx.insert(ContractAmendmentSchema).values({
    contractId:id,rentalId:state.rental.id,userId:uid,actorId:uid,
    fromRevisionId:state.previous.id,toRevisionId:revisionId,
    transactionId:sql.raw('txid_current()'),beforeFacts:state.before,afterFacts:state.after,
    paymentChanged:state.paymentChanged
   });
   const [updated]=await tx.update(RentalSchema).set({
    propertyId:state.after.propertyId,startDate:state.after.startDate,endDate:state.after.endDate,
    guests:state.after.guests,revenue:state.after.revenueCents/100,profit:state.after.profitCents/100
   }).where(and(eq(RentalSchema.id,state.rental.id),eq(RentalSchema.userId,uid),
    eq(RentalSchema.isActive,true))).returning({id:RentalSchema.id});
   if(!updated)throw new ConflictException('Booking changed');
   if(state.paymentChanged&&state.proposed){
    await tx.delete(RentalInstallmentSchema).where(and(eq(RentalInstallmentSchema.rentalId,state.rental.id),
     eq(RentalInstallmentSchema.userId,uid)));
    await tx.insert(RentalInstallmentSchema).values(state.proposed.map(x=>({
     ...x,rentalId:state.rental.id,userId:uid,receivedCents:0
    })));
   }
   await tx.insert(ContractAuditEventSchema).values({userId:uid,actorId:uid,
    action:'APPROVE_CONTRACT_AMENDMENT',targetType:'CONTRACT',targetId:id,outcome:'SUCCESS'});
   return {applied:true,rentalId:updated.id,revisionId,status:'DRAFT',signatureStatus:'UNSIGNED',
    before:state.before,after:state.after};
  });}catch(e){
   const cause=e as {code?:string;cause?:{code?:string}};
   const code=cause.code??cause.cause?.code;
   if(code==='23P01')throw new ConflictException('Dates are already booked for the property');
   if(code==='23514')throw new ConflictException('Protected contract terms cannot be changed');
   throw e;
  }
 }
}
