import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {and,desc,eq,sql} from 'drizzle-orm';
import {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {DRIZZLE} from '../../persistence/database.module';
import {RentalSchema} from '../../persistence/schemas/rental-schema';
import {PropertySchema} from '../../persistence/schemas/property-schema';
import {PropertyContractSettingsSchema} from '../../persistence/schemas/property-contract-settings-schema';
import {RentalGuestDetailsSchema} from '../../persistence/schemas/rental-guest-details-schema';
import {RentalInstallmentSchema} from '../../persistence/schemas/rental-installment-schema';
import {ContractSchema} from '../../persistence/schemas/contract-schema';
import {ContractRevisionSchema} from '../../persistence/schemas/contract-revision-schema';
import {ContractTemplateVersionSchema} from '../../persistence/schemas/contract-template-version-schema';
import {ContractSettingsSchema} from '../../persistence/schemas/contract-settings-schema';
import {ContractAuditEventSchema} from '../../persistence/schemas/contract-security-schema';
import {ContractDataCrypto} from '../../security/encrypted-data';
import {renderContractPreview,type PreviewInput} from '../../../core/domain/contract/contract-preview';
import {verifyInstallments} from '../../../core/domain/contract/contract-validation';
import {canCancelBeforeCheckIn} from '../../../core/domain/contract/cancellation-cutoff';
import {ContractDraftEditDto} from '../../../web/dto-web/contract/contract-draft-edit.dto';

type GuestRow=typeof RentalGuestDetailsSchema.$inferSelect;
type PaymentRow=typeof RentalInstallmentSchema.$inferSelect;
function editToken(revisionId:string,guest:GuestRow|undefined,rows:PaymentRow[]){
 const safe={revisionId,nonce:guest?.identityNonce?.toString('hex')??'',
  ciphertext:guest?.identityCiphertext?.toString('hex')??'',
  payments:rows.map(x=>[x.id,x.sequence,x.agreedCents,x.dueDate,x.dueEvent,x.paymentMethod,
   x.isDeposit,x.receivedCents,x.paidAt?.toISOString()??null])};
 return createHash('sha256').update(JSON.stringify(safe)).digest('hex');
}
function dateOnly(value:string|undefined){
 if(!value)return undefined;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||
   new Date(value).toISOString().slice(0,10)!==value)
  throw new BadRequestException('Invalid payment due date');
 return value;
}

/** All access is scoped by the verified session uid; no owner ID is accepted from the browser. */
@Injectable()
export class ContractWorkspaceService {
 constructor(@Inject(DRIZZLE) private readonly db:NodePgDatabase){}
 async list(uid:string,filter:{status?:string;propertyId?:string;query?:string}={}){
  if(!uid)throw new NotFoundException();
  if(filter.status!==undefined&&typeof filter.status!=='string')throw new BadRequestException('Invalid status filter');
  if(filter.propertyId!==undefined&&typeof filter.propertyId!=='string')throw new BadRequestException('Invalid property filter');
  if(filter.query!==undefined&&typeof filter.query!=='string')throw new BadRequestException('Invalid search filter');
  if(filter.status&&!['ALL','DRAFT','READY','FINALIZED','CANCELLED'].includes(filter.status))
   throw new BadRequestException('Invalid status filter');
  if(filter.propertyId&&!/^[0-9a-f-]{36}$/i.test(filter.propertyId))
   throw new BadRequestException('Invalid property filter');
  if(filter.query&&filter.query.length>100)throw new BadRequestException('Search is too long');
  const rows=await this.db.select({id:ContractSchema.id,rentalId:RentalSchema.id,
   propertyId:RentalSchema.propertyId,propertyName:PropertySchema.name,
   firstName:RentalSchema.clientFirstName,lastName:RentalSchema.clientLastName,
   startDate:RentalSchema.startDate,endDate:RentalSchema.endDate,
   guests:RentalSchema.guests,revenue:RentalSchema.revenue,isActive:RentalSchema.isActive,
   createdAt:ContractSchema.createdAt
  }).from(ContractSchema)
   .innerJoin(RentalSchema,and(eq(ContractSchema.rentalId,RentalSchema.id),
    eq(RentalSchema.userId,uid)))
   .innerJoin(PropertySchema,and(eq(RentalSchema.propertyId,PropertySchema.id),
    eq(PropertySchema.userId,uid)))
   .where(eq(ContractSchema.userId,uid)).orderBy(desc(ContractSchema.createdAt)).limit(100);
  const results=await Promise.all(rows.map(async row=>{
   const [revision]=await this.db.select({id:ContractRevisionSchema.id,
     status:ContractRevisionSchema.status,version:ContractRevisionSchema.versionNumber
   }).from(ContractRevisionSchema).where(and(eq(ContractRevisionSchema.contractId,row.id),
    eq(ContractRevisionSchema.userId,uid)))
    .orderBy(desc(ContractRevisionSchema.versionNumber)).limit(1);
   return {...row,cancelled:!row.isActive,revisionId:revision?.id??null,
    revisionVersion:revision?.version??null,status:revision?.status??'DRAFT'};
  }));
  const query=(filter.query??'').trim().toLocaleLowerCase('pt-BR');
  return {items:results.filter(row=>
   (!filter.status||filter.status==='ALL'||(filter.status==='CANCELLED'?row.cancelled:!row.cancelled&&row.status===filter.status))&&
   (!filter.propertyId||row.propertyId===filter.propertyId)&&
   (!query||[row.firstName,row.lastName,row.propertyName,row.startDate,row.endDate]
    .join(' ').toLocaleLowerCase('pt-BR').includes(query))),
   limitedToRecent:100};
 }
 private async rental(uid:string,contractId:string){
  const [contract]=await this.db.select().from(ContractSchema).where(and(
   eq(ContractSchema.id,contractId),eq(ContractSchema.userId,uid))).limit(1);
  if(!contract)throw new NotFoundException('Contract not found');
  const [rental]=await this.db.select().from(RentalSchema).where(and(
   eq(RentalSchema.id,contract.rentalId),eq(RentalSchema.userId,uid))).limit(1);
  if(!rental)throw new NotFoundException('Contract not found');
  const [property]=await this.db.select().from(PropertySchema).where(and(
   eq(PropertySchema.id,rental.propertyId),eq(PropertySchema.userId,uid))).limit(1);
  if(!property)throw new NotFoundException('Contract not found');
  return {contract,rental,property};
 }
 async detail(uid:string,contractId:string){
  if(!uid)throw new NotFoundException();
  const {rental,property}=await this.rental(uid,contractId);
  const revisions=await this.db.select().from(ContractRevisionSchema).where(and(
   eq(ContractRevisionSchema.contractId,contractId),
   eq(ContractRevisionSchema.userId,uid))).orderBy(desc(ContractRevisionSchema.versionNumber));
  const current=revisions[0];
  if(!current)throw new NotFoundException('Contract revision not found');
  const [identity]=await this.db.select().from(RentalGuestDetailsSchema).where(and(
   eq(RentalGuestDetailsSchema.rentalId,rental.id),
   eq(RentalGuestDetailsSchema.userId,uid))).limit(1);
  const installments=await this.db.select().from(RentalInstallmentSchema).where(and(
   eq(RentalInstallmentSchema.rentalId,rental.id),
   eq(RentalInstallmentSchema.userId,uid))).orderBy(RentalInstallmentSchema.sequence);
  const crypto=new ContractDataCrypto();
  const guest:Record<string,string>=identity?.identityCiphertext&&identity.identityNonce&&
   identity.identityAuthTag&&identity.identityKeyVersion
   ?JSON.parse(crypto.open({
    ciphertext:identity.identityCiphertext,nonce:identity.identityNonce,
    authTag:identity.identityAuthTag,keyVersion:identity.identityKeyVersion
   },uid,'guest',rental.id).toString('utf8')) as Record<string,string>:{};
  const [settings]=await this.db.select().from(ContractSettingsSchema)
   .where(eq(ContractSettingsSchema.userId,uid)).limit(1);
  const landlord=settings?.profileCiphertext&&settings.profileNonce&&settings.profileAuthTag&&
   settings.profileKeyVersion
   ?JSON.parse(crypto.open({
    ciphertext:settings.profileCiphertext,nonce:settings.profileNonce,
    authTag:settings.profileAuthTag,keyVersion:settings.profileKeyVersion
   },uid,'landlord-profile',uid).toString('utf8')) as PreviewInput['landlord']:null;
  const [propertyRules]=await this.db.select().from(PropertyContractSettingsSchema).where(and(
   eq(PropertyContractSettingsSchema.propertyId,property.id),
   eq(PropertyContractSettingsSchema.userId,uid))).limit(1);
  const [template]=current.templateVersionId
   ?await this.db.select().from(ContractTemplateVersionSchema).where(and(
    eq(ContractTemplateVersionSchema.id,current.templateVersionId),
    eq(ContractTemplateVersionSchema.userId,uid),
    eq(ContractTemplateVersionSchema.status,'PUBLISHED'))).limit(1)
   :await this.db.select().from(ContractTemplateVersionSchema).where(and(
    eq(ContractTemplateVersionSchema.userId,uid),
    eq(ContractTemplateVersionSchema.status,'PUBLISHED')))
    .orderBy(desc(ContractTemplateVersionSchema.publishedAt)).limit(1);
  const defaultPolicy=(settings?.policyConfig??{}) as PreviewInput['policy'];
  const policy=(template?.policySnapshot&&Object.keys(template.policySnapshot).length
   ?template.policySnapshot:defaultPolicy) as PreviewInput['policy'];
  const paymentRows=installments.map(x=>({
   id:x.id,sequence:x.sequence,agreedCents:x.agreedCents,dueDate:x.dueDate,
   dueEvent:x.dueEvent,paymentMethod:x.paymentMethod,isDeposit:x.isDeposit,
   receivedCents:x.receivedCents,paidAt:x.paidAt
  }));
  const preview=renderContractPreview({
   template:template?.clauses as PreviewInput['template']??null,landlord,guest,
   rental:{clientFirstName:rental.clientFirstName,clientLastName:rental.clientLastName,
    startDate:rental.startDate,endDate:rental.endDate,guests:rental.guests,revenue:rental.revenue},
   property:{address:property.address},
   propertyRules:{
    checkInTime:propertyRules?.checkInTime??null,
    checkOutTime:propertyRules?.checkOutTime??null,
    includedOccupancy:propertyRules?.includedOccupancy??null,
    maximumOccupancy:propertyRules?.maximumOccupancy??null,
    extraGuestRateCents:propertyRules?.extraGuestRateCents??null
   },policy,installments:paymentRows
  });
  const plainMeta=current.snapshotCiphertext&&current.snapshotNonce&&current.snapshotAuthTag&&
   current.snapshotKeyVersion
   ?JSON.parse(crypto.open({
    ciphertext:current.snapshotCiphertext,nonce:current.snapshotNonce,
    authTag:current.snapshotAuthTag,keyVersion:current.snapshotKeyVersion,
    sha256:current.snapshotSha256??undefined
   },uid,'contract-snapshot',current.id).toString('utf8')) as Record<string,unknown>:null;
  if(current.status==='FINALIZED'&&
   (!plainMeta||plainMeta.schemaVersion!==1||!Array.isArray(plainMeta.clauses)))
   throw new ConflictException('Archived contract content is unavailable');
  const frozenClauses=current.status==='FINALIZED'
   ?plainMeta!.clauses as typeof preview.clauses:null;
  const displayedPreview=frozenClauses
   ?{...preview,watermark:'FINALIZADO - NAO ASSINADO' as const,ready:true,missing:[],clauses:frozenClauses}
   :preview;
  const archivedPricing=current.status==='FINALIZED'&&plainMeta?.pricing&&
   typeof plainMeta.pricing==='object'&&!Array.isArray(plainMeta.pricing)
   ?plainMeta.pricing as Record<string,unknown>:plainMeta;
  await this.db.insert(ContractAuditEventSchema).values({
   userId:uid,actorId:uid,action:'VIEW_CONTRACT_DRAFT',targetType:'CONTRACT',
   targetId:contractId,outcome:'SUCCESS'
  });
  return {
   id:contractId,rentalId:rental.id,property:{id:property.id,name:property.name,address:property.address},
   booking:{clientFirstName:rental.clientFirstName,clientLastName:rental.clientLastName,
    startDate:rental.startDate,endDate:rental.endDate,guests:rental.guests,
    totalCents:Math.round(rental.revenue*100)},
   status:current.status,cancelled:!rental.isActive,
   cancellationEligible:rental.isActive&&canCancelBeforeCheckIn(rental.startDate,propertyRules?.checkInTime),
   revisionId:current.id,revisionVersion:current.versionNumber,
   history:revisions.map(x=>({id:x.id,status:x.status,version:x.versionNumber,
    finalizedAt:x.finalizedAt,createdAt:x.createdAt})),
   guest,installments:paymentRows,
   editToken:editToken(current.id,identity,installments),
   pricing:{baseRevenueCents:archivedPricing?.baseRevenueCents??null,
    calculatedExtraCents:archivedPricing?.calculatedExtraCents??null,
    chargedExtraCents:archivedPricing?.chargedExtraCents??null,
    guestFeeMode:archivedPricing?.guestFeeMode??null,
    guestFeeReason:archivedPricing?.guestFeeReason??null},
   templateVersion:template?.versionNumber??null,
   preview:displayedPreview,editable:current.status==='DRAFT'&&rental.isActive&&
    !revisions.some(x=>x.status==='FINALIZED')
  };
 }
 async auditPdfPreview(uid:string,contractId:string){
  await this.db.insert(ContractAuditEventSchema).values({
   userId:uid,actorId:uid,action:'VIEW_DRAFT_PDF',targetType:'CONTRACT',
   targetId:contractId,outcome:'SUCCESS'
  });
 }
 async save(uid:string,contractId:string,input:ContractDraftEditDto){
  if(!uid)throw new NotFoundException();
  if(input.guest===undefined&&input.installments===undefined)
   throw new BadRequestException('No draft fields to save');
  const crypto=new ContractDataCrypto();
  await this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}),hashtext(${contractId}))`);
   const [contract]=await tx.select().from(ContractSchema).where(and(
    eq(ContractSchema.id,contractId),eq(ContractSchema.userId,uid))).limit(1);
   if(!contract)throw new NotFoundException('Contract not found');
   const [rental]=await tx.select().from(RentalSchema).where(and(
    eq(RentalSchema.id,contract.rentalId),eq(RentalSchema.userId,uid))).limit(1);
   if(!rental)throw new NotFoundException('Contract not found');
   if(rental.isActive===false)throw new ConflictException('Cancelled booking cannot be edited');
   const [revision]=await tx.select().from(ContractRevisionSchema).where(and(
    eq(ContractRevisionSchema.contractId,contractId),
    eq(ContractRevisionSchema.userId,uid)))
    .orderBy(desc(ContractRevisionSchema.versionNumber)).limit(1);
   if(!revision||revision.status!=='DRAFT')throw new ConflictException('Only drafts can be edited');
   const [alreadyApproved]=await tx.select({id:ContractRevisionSchema.id}).from(ContractRevisionSchema)
    .where(and(eq(ContractRevisionSchema.contractId,contractId),
     eq(ContractRevisionSchema.userId,uid),eq(ContractRevisionSchema.status,'FINALIZED'))).limit(1);
   if(alreadyApproved)throw new ConflictException('Landlord-approved amendment drafts cannot be edited after an earlier finalized contract');
   const [existingGuest]=await tx.select().from(RentalGuestDetailsSchema).where(and(
    eq(RentalGuestDetailsSchema.rentalId,rental.id),
    eq(RentalGuestDetailsSchema.userId,uid))).limit(1);
   const existingPayments=await tx.select().from(RentalInstallmentSchema).where(and(
    eq(RentalInstallmentSchema.rentalId,rental.id),
    eq(RentalInstallmentSchema.userId,uid))).orderBy(RentalInstallmentSchema.sequence);
   if(editToken(revision.id,existingGuest,existingPayments)!==input.editToken)
    throw new ConflictException('Draft changed; reload before saving');
   if(input.installments!==undefined){
    if(existingPayments.some(x=>x.receivedCents>0||x.paidAt))
     throw new ConflictException('Received payments cannot be rewritten');
    try {verifyInstallments(Math.round(rental.revenue*100),
      input.installments.map(x=>x.agreedCents));}
    catch{throw new BadRequestException('Installments must exactly match booking total');}
    if(input.installments.filter(x=>x.isDeposit).length>1)
     throw new BadRequestException('Only one deposit installment is allowed');
    const [settings]=await tx.select({defaults:ContractSettingsSchema.paymentDefaults})
     .from(ContractSettingsSchema).where(eq(ContractSettingsSchema.userId,uid)).limit(1);
    const methods=Array.isArray(settings?.defaults?.acceptedMethods)
     ?settings.defaults.acceptedMethods as string[]:[];
    for(const row of input.installments){
     dateOnly(row.dueDate);
     if(row.dueDate&&row.dueEvent)throw new BadRequestException('Installment due rule conflicts');
     if(row.paymentMethod&&methods.length&&!methods.includes(row.paymentMethod))
      throw new BadRequestException('Payment method not accepted by account policy');
    }
    await tx.delete(RentalInstallmentSchema).where(and(
     eq(RentalInstallmentSchema.rentalId,rental.id),
     eq(RentalInstallmentSchema.userId,uid)));
    await tx.insert(RentalInstallmentSchema).values(input.installments.map((x,i)=>({
     rentalId:rental.id,userId:uid,sequence:i+1,agreedCents:x.agreedCents,
     dueDate:x.dueDate??null,dueEvent:x.dueEvent??null,paymentMethod:x.paymentMethod??null,
     isDeposit:x.isDeposit??false,receivedCents:0
    })));
   }
   if(input.guest!==undefined){
    const sealed=crypto.seal(Buffer.from(JSON.stringify(input.guest),'utf8'),uid,'guest',rental.id);
    await tx.insert(RentalGuestDetailsSchema).values({
     rentalId:rental.id,userId:uid,identityCiphertext:sealed.ciphertext,
     identityNonce:sealed.nonce,identityAuthTag:sealed.authTag,identityKeyVersion:sealed.keyVersion
    }).onConflictDoUpdate({target:RentalGuestDetailsSchema.rentalId,set:{
     identityCiphertext:sealed.ciphertext,identityNonce:sealed.nonce,
     identityAuthTag:sealed.authTag,identityKeyVersion:sealed.keyVersion,updatedAt:new Date()
    }});
   }
   await tx.insert(ContractAuditEventSchema).values({
    userId:uid,actorId:uid,action:'EDIT_CONTRACT_DRAFT',targetType:'CONTRACT',
    targetId:contractId,outcome:'SUCCESS'
   });
  });
  return this.detail(uid,contractId);
 }
}
