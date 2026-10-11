import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {createHmac,randomUUID} from 'node:crypto';
import {and,desc,eq,sql} from 'drizzle-orm';
import {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {rentalCharge,verifyInstallments,type GuestFeeChoice} from '../../../core/domain/contract/contract-validation';
import {CreateRentalWebDto} from '../../../web/dto-web/rental/create-rental.web-dto';
import {BookingQuoteDto} from '../../../web/dto-web/contract/booking-quote.dto';
import {DRIZZLE} from '../../persistence/database.module';
import {RentalSchema} from '../../persistence/schemas/rental-schema';
import {PropertySchema} from '../../persistence/schemas/property-schema';
import {PropertyContractSettingsSchema} from '../../persistence/schemas/property-contract-settings-schema';
import {RentalGuestDetailsSchema} from '../../persistence/schemas/rental-guest-details-schema';
import {RentalInstallmentSchema} from '../../persistence/schemas/rental-installment-schema';
import {ContractSchema} from '../../persistence/schemas/contract-schema';
import {ContractRevisionSchema} from '../../persistence/schemas/contract-revision-schema';
import {ContractTemplateVersionSchema} from '../../persistence/schemas/contract-template-version-schema';
import {ContractIdempotencySchema,ContractAuditEventSchema} from '../../persistence/schemas/contract-security-schema';
import {ContractDataCrypto} from '../../security/encrypted-data';

export function checkedNights(start:string,end:string):number {
 const parsed=(s:string)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new BadRequestException('Invalid rental dates');
  const value=new Date(s);
  if(!Number.isFinite(value.getTime())||value.toISOString().slice(0,10)!==s)
   throw new BadRequestException('Invalid rental dates');
  return value.getTime();
 };
 const a=parsed(start),b=parsed(end);
 if(b<=a)throw new BadRequestException('End date must follow start date');
 if(start<new Date().toISOString().slice(0,10))
  throw new BadRequestException('Start date cannot be in the past');
 const nights=(b-a)/86_400_000;
 if(nights>365)throw new BadRequestException('Stay exceeds supported duration');
 return nights;
}
function toCents(reais:number):number {
 if(!Number.isFinite(reais)||reais<0||reais>10_000_000||
  Math.abs(reais*100-Math.round(reais*100))>0.000001)
  throw new BadRequestException('Amounts must have two decimal places or less');
 return Math.round(reais*100);
}
function digest(uid:string,dto:CreateRentalWebDto):string {
 const active=process.env.CONTRACT_ACTIVE_KEY_VERSION,raw=process.env.CONTRACT_DATA_KEYS;
 if(!active||!raw)throw new Error('Contract keys not configured');
 const key=(JSON.parse(raw) as Record<string,string>)[active];
 if(!key)throw new Error('Contract key version unavailable');
 // Keyed HMAC: do not store a publicly guessable hash of CPF/payment data.
 return createHmac('sha256',Buffer.from(key,'base64'))
  .update('rentalflow-create-draft-v1:').update(uid).update(':')
  .update(JSON.stringify(dto)).digest('hex');
}

@Injectable()
export class ContractBookingService {
 constructor(@Inject(DRIZZLE) private readonly db:NodePgDatabase){}
 async quote(uid:string,input:BookingQuoteDto){
  if(!uid)throw new NotFoundException();
  const nights=checkedNights(input.startDate,input.endDate);
  const baseCents=toCents(input.revenue);
  if(!Number.isSafeInteger(input.guests)||input.guests<1)
   throw new BadRequestException('Invalid guest count');
  const override=input.guestFee??{mode:'AUTOMATIC' as const};
  if((override.mode==='ADJUSTED'&&override.cents===undefined)||
   (override.mode==='WAIVED'&&override.cents!==undefined)||
   (override.mode==='AUTOMATIC'&&(override.cents!==undefined||override.reason!==undefined)))
   throw new BadRequestException('Invalid extra-guest fee selection');
  const [property]=await this.db.select({id:PropertySchema.id}).from(PropertySchema)
   .where(and(eq(PropertySchema.id,input.propertyId),eq(PropertySchema.userId,uid),
    eq(PropertySchema.isActive,true))).limit(1);
  if(!property)throw new NotFoundException('Property not found');
  const [policy]=await this.db.select().from(PropertyContractSettingsSchema).where(and(
   eq(PropertyContractSettingsSchema.propertyId,property.id),
   eq(PropertyContractSettingsSchema.userId,uid))).limit(1);
  if(!policy||policy.includedOccupancy===null||policy.maximumOccupancy===null||
   policy.extraGuestRateCents===null)
   throw new ConflictException('Property occupancy policy must be configured');
  const choice:GuestFeeChoice=override.mode==='WAIVED'
   ?{mode:'WAIVED',reason:override.reason??''}
   :override.mode==='ADJUSTED'
   ?{mode:'ADJUSTED',cents:override.cents!,reason:override.reason??''}
   :{mode:'AUTOMATIC'};
  try {
   const amounts=rentalCharge(baseCents,input.guests,nights,{
    included:policy.includedOccupancy,maximum:policy.maximumOccupancy,
    extraRateCents:policy.extraGuestRateCents},choice,true);
   return {baseCents,guests:input.guests,nights,...amounts};
  }catch{throw new BadRequestException('Invalid occupancy or extra-guest rate');}
 }

 async create(uid:string,dto:CreateRentalWebDto){
  if(!uid)throw new NotFoundException();
  const draft=dto.bookingDraft;
  if(!draft)throw new BadRequestException('Booking contract input required');
  const nights=checkedNights(dto.startDate,dto.endDate);
  const base=toCents(dto.revenue),fee=toCents(dto.fee);
  if(base!==draft.baseRevenueCents)throw new BadRequestException('Base price mismatch');
  if(!Number.isSafeInteger(dto.guests)||dto.guests<1)throw new BadRequestException('Invalid guest count');
  if(draft.installments&&(!draft.installments.length||draft.installments.length>12))
   throw new BadRequestException('Invalid installment count');
  const override=draft.guestFee??{mode:'AUTOMATIC' as const};
  if((override.mode==='ADJUSTED'&&override.cents===undefined)||
    (override.mode==='WAIVED'&&override.cents!==undefined)||
    (override.mode==='AUTOMATIC'&&(override.cents!==undefined||override.reason!==undefined)))
   throw new BadRequestException('Invalid extra-guest fee selection');
  const crypto=new ContractDataCrypto(); // fail closed when encryption secrets are absent
  const requestHash=digest(uid,dto);
  try{return await this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}),hashtext(${draft.requestKey}))`);
   const [prior]=await tx.select().from(ContractIdempotencySchema).where(and(
    eq(ContractIdempotencySchema.userId,uid),
    eq(ContractIdempotencySchema.operation,'CREATE_BOOKING_CONTRACT'),
    eq(ContractIdempotencySchema.requestKey,draft.requestKey))).limit(1);
   if(prior){
    if(prior.requestSha256!==requestHash)
     throw new ConflictException('Request key reused with different booking information');
    if(prior.status!=='COMPLETED'||!prior.resourceId)
     throw new ConflictException('Prior booking is incomplete');
    const [saved]=await tx.select().from(RentalSchema).where(and(
     eq(RentalSchema.id,prior.resourceId),eq(RentalSchema.userId,uid))).limit(1);
    const [existingContract]=saved?await tx.select({id:ContractSchema.id}).from(ContractSchema).where(and(
     eq(ContractSchema.rentalId,saved.id),eq(ContractSchema.userId,uid))).limit(1):[];
    if(!saved||!existingContract)throw new ConflictException('Prior booking not found');
    return this.reply(saved,existingContract.id,base);
   }

   const [property]=await tx.select({id:PropertySchema.id}).from(PropertySchema).where(and(
    eq(PropertySchema.id,dto.propertyId),eq(PropertySchema.userId,uid),
    eq(PropertySchema.isActive,true))).limit(1);
   if(!property)throw new NotFoundException('Property not found');
   const [policy]=await tx.select().from(PropertyContractSettingsSchema).where(and(
    eq(PropertyContractSettingsSchema.propertyId,property.id),
    eq(PropertyContractSettingsSchema.userId,uid))).limit(1);
   if(!policy||policy.includedOccupancy===null||policy.maximumOccupancy===null||
     policy.extraGuestRateCents===null)
    throw new ConflictException('Property occupancy policy must be configured');
   const choice:GuestFeeChoice=override.mode==='WAIVED'
    ?{mode:'WAIVED',reason:override.reason??''}
    :override.mode==='ADJUSTED'
    ?{mode:'ADJUSTED',cents:override.cents!,reason:override.reason??''}
    :{mode:'AUTOMATIC'};
   let quote;
   try {quote=rentalCharge(base,dto.guests,nights,{
    included:policy.includedOccupancy,maximum:policy.maximumOccupancy,
    extraRateCents:policy.extraGuestRateCents},choice,true);}
   catch{throw new BadRequestException('Invalid occupancy or extra-guest rate');}
   // Reject stale/unreviewed price quotes. Never accept a client-asserted total.
   if(quote.totalCents!==draft.confirmedTotalCents)
    throw new ConflictException('Final price changed; request a new quote');
   try{verifyInstallments(quote.totalCents,draft.installments?.map(x=>x.agreedCents)??[quote.totalCents]);}
   catch{throw new BadRequestException('Installments must total agreed booking amount');}
   if(draft.paymentDueEvent&&draft.paymentDueDate)throw new BadRequestException('Only one default due rule allowed');
   if(draft.paymentDueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(draft.paymentDueDate)||
    Number.isNaN(Date.parse(draft.paymentDueDate))||
    new Date(draft.paymentDueDate).toISOString().slice(0,10)!==draft.paymentDueDate))
    throw new BadRequestException('Invalid default payment date');
   for(const item of draft.installments??[]){
    if(item.dueDate&&item.dueEvent)throw new BadRequestException('Only one due rule per installment');
    if(item.dueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)||
     Number.isNaN(Date.parse(item.dueDate))||
     new Date(item.dueDate).toISOString().slice(0,10)!==item.dueDate))
     throw new BadRequestException('Invalid installment date');
   }
   await tx.insert(ContractIdempotencySchema).values({
    userId:uid,operation:'CREATE_BOOKING_CONTRACT',requestKey:draft.requestKey,
    requestSha256:requestHash,status:'PENDING',expiresAt:new Date(Date.now()+86_400_000)
   });
   const [rental]=await tx.insert(RentalSchema).values({
    userId:uid,propertyId:property.id,clientFirstName:dto.clientFirstName,
    clientLastName:dto.clientLastName,startDate:dto.startDate,endDate:dto.endDate,
    guests:dto.guests,revenue:quote.totalCents/100,fee:fee/100,
    profit:(quote.totalCents-fee)/100
   }).returning();
   const [contract]=await tx.insert(ContractSchema).values({
    userId:uid,rentalId:rental.id}).returning({id:ContractSchema.id});
   const [published]=await tx.select({id:ContractTemplateVersionSchema.id})
    .from(ContractTemplateVersionSchema).where(and(
     eq(ContractTemplateVersionSchema.userId,uid),
     eq(ContractTemplateVersionSchema.status,'PUBLISHED')
    )).orderBy(desc(ContractTemplateVersionSchema.publishedAt)).limit(1);
   // Keep booking and override provenance encrypted; this is an incomplete draft,
   // not a final/legal snapshot. Task 4.4 must revalidate before finalization.
   const revisionId=randomUUID();
   const metadata=crypto.seal(Buffer.from(JSON.stringify({
    kind:'BOOKING_DRAFT_METADATA',isFinal:false,
    rentalId:rental.id,propertyId:property.id,startDate:dto.startDate,
    endDate:dto.endDate,guests:dto.guests,baseRevenueCents:base,
    calculatedExtraCents:quote.calculatedExtraCents,
    chargedExtraCents:quote.chargedExtraCents,totalCents:quote.totalCents,
    guestFeeMode:choice.mode,guestFeeReason:choice.mode==='AUTOMATIC'?null:choice.reason,
    includedOccupancy:policy.includedOccupancy,maximumOccupancy:policy.maximumOccupancy,
    extraGuestRateCents:policy.extraGuestRateCents,actorId:uid
   }),'utf8'),uid,'contract-snapshot',revisionId);
   await tx.insert(ContractRevisionSchema).values({
    id:revisionId,userId:uid,contractId:contract.id,
    templateVersionId:published?.id??null,versionNumber:1,status:'DRAFT',
    snapshotCiphertext:metadata.ciphertext,snapshotNonce:metadata.nonce,
    snapshotAuthTag:metadata.authTag,snapshotKeyVersion:metadata.keyVersion,
    snapshotSha256:metadata.sha256
   });
   if(draft.guest&&Object.keys(draft.guest).length){
    const sealed=crypto.seal(Buffer.from(JSON.stringify(draft.guest),'utf8'),uid,'guest',rental.id);
    await tx.insert(RentalGuestDetailsSchema).values({
     userId:uid,rentalId:rental.id,identityCiphertext:sealed.ciphertext,
     identityNonce:sealed.nonce,identityAuthTag:sealed.authTag,
     identityKeyVersion:sealed.keyVersion
    });
   }
   const schedule=draft.installments?.length?draft.installments:[{agreedCents:quote.totalCents,paymentMethod:draft.paymentMethod,dueEvent:draft.paymentDueEvent,dueDate:draft.paymentDueDate}];
   await tx.insert(RentalInstallmentSchema).values(schedule.map((item,index)=>({
    rentalId:rental.id,userId:uid,sequence:index+1,agreedCents:item.agreedCents,
    dueDate:'dueDate' in item?item.dueDate:undefined,
    dueEvent:'dueEvent' in item?item.dueEvent:undefined,
    paymentMethod:'paymentMethod' in item?item.paymentMethod:undefined,
    isDeposit:'isDeposit' in item?item.isDeposit??false:false,
    receivedCents:0
   })));
   await tx.insert(ContractAuditEventSchema).values({
    userId:uid,actorId:uid,action:'CREATE_BOOKING_DRAFT',
    targetType:'CONTRACT',targetId:contract.id,outcome:'SUCCESS'
   });
   await tx.update(ContractIdempotencySchema).set({
    status:'COMPLETED',resourceId:rental.id
   }).where(and(eq(ContractIdempotencySchema.userId,uid),
    eq(ContractIdempotencySchema.operation,'CREATE_BOOKING_CONTRACT'),
    eq(ContractIdempotencySchema.requestKey,draft.requestKey)));
   return this.reply(rental,contract.id,base);
  });}
  catch(error){
   const code=(error as {code?:string,cause?:{code?:string}})?.code ??
    (error as {cause?:{code?:string}})?.cause?.code;
   if(code==='23P01')throw new ConflictException('Date already booked for property');
   if(code==='23503')throw new NotFoundException('Property not found in account');
   throw error;
  }
 }
 private reply(row:typeof RentalSchema.$inferSelect,contractId:string,base:number){
  return {
   userId:row.userId,clientFirstName:row.clientFirstName,
   clientLastName:row.clientLastName,startDate:row.startDate,endDate:row.endDate,
   guests:row.guests,revenue:row.revenue,fee:row.fee,profit:row.profit,
   rentalId:row.id,contractId,contractStatus:'DRAFT',
   totalCents:Math.round(row.revenue*100),
   chargedExtraCents:Math.round(row.revenue*100)-base
  };
 }
}
