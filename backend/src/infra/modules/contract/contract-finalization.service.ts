import {BadRequestException,ConflictException,Inject,Injectable,NotFoundException} from '@nestjs/common';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {and,desc,eq,sql} from 'drizzle-orm';
import {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {DRIZZLE} from '../../persistence/database.module';
import {ContractSchema} from '../../persistence/schemas/contract-schema';
import {ContractRevisionSchema} from '../../persistence/schemas/contract-revision-schema';
import {ContractTemplateVersionSchema} from '../../persistence/schemas/contract-template-version-schema';
import {ContractSettingsSchema} from '../../persistence/schemas/contract-settings-schema';
import {ContractAuditEventSchema} from '../../persistence/schemas/contract-security-schema';
import {RentalSchema} from '../../persistence/schemas/rental-schema';
import {RentalGuestDetailsSchema} from '../../persistence/schemas/rental-guest-details-schema';
import {RentalInstallmentSchema} from '../../persistence/schemas/rental-installment-schema';
import {PropertySchema} from '../../persistence/schemas/property-schema';
import {PropertyContractSettingsSchema} from '../../persistence/schemas/property-contract-settings-schema';
import {ContractDataCrypto} from '../../security/encrypted-data';
import {renderContractPreview} from '../../../core/domain/contract/contract-preview';
import {validateClauses,validateLandlordForPublish,type ContractClause,type ContractPolicy,type ContractPayment,type LandlordProfile} from '../../../core/domain/contract/contract-questionnaire';
import {verifyGuestFinalization,verifyInstallments} from '../../../core/domain/contract/contract-validation';
import {renderFinalContractPdf} from './contract-final-pdf';

type Db=NodePgDatabase;
type Tx=Parameters<Parameters<Db['transaction']>[0]>[0];
function strictCents(amount:number){
 const cents=amount*100;
 if(!Number.isFinite(cents)||cents<0||cents>1_000_000_000||
  Math.abs(cents-Math.round(cents))>0.000001)throw new ConflictException('Invalid recorded contract amount');
 return Math.round(cents);
}
function openJson<T>(crypto:ContractDataCrypto,uid:string,kind:string,id:string,
 cipher:Buffer|null|undefined,nonce:Buffer|null|undefined,tag:Buffer|null|undefined,key:string|null|undefined):T{
 if(!cipher||!nonce||!tag||!key)throw new ConflictException('Required encrypted data is incomplete');
 return JSON.parse(crypto.open({ciphertext:cipher,nonce,authTag:tag,keyVersion:key},uid,kind,id).toString('utf8')) as T;
}
function signedReview(uid:string,snapshot:unknown):string{
 const raw=process.env.CONTRACT_DATA_KEYS,active=process.env.CONTRACT_ACTIVE_KEY_VERSION;
 if(!raw||!active)throw new Error('Contract encryption key is unavailable');
 const key=(JSON.parse(raw) as Record<string,string>)[active];
 if(!key)throw new Error('Contract key version is unavailable');
 return createHmac('sha256',Buffer.from(key,'base64')).update('rentalflow-final-review-v1:')
  .update(uid).update(':').update(JSON.stringify(snapshot)).digest('hex');
}
/** Every finalization rechecks canonical tenant-owned rows under the same lock as draft editing. */
@Injectable()
export class ContractFinalizationService {
 constructor(@Inject(DRIZZLE) private readonly db:Db){}
 private async load(tx:Tx,uid:string,id:string){
  const [contract]=await tx.select().from(ContractSchema).where(and(
   eq(ContractSchema.id,id),eq(ContractSchema.userId,uid))).limit(1);
  if(!contract)throw new NotFoundException('Contract not found');
  const [revision]=await tx.select().from(ContractRevisionSchema).where(and(
   eq(ContractRevisionSchema.contractId,id),eq(ContractRevisionSchema.userId,uid)))
   .orderBy(desc(ContractRevisionSchema.versionNumber)).limit(1);
  if(!revision||revision.status!=='DRAFT')throw new ConflictException('No editable draft revision');
  const [rental]=await tx.select().from(RentalSchema).where(and(
   eq(RentalSchema.id,contract.rentalId),eq(RentalSchema.userId,uid))).limit(1);
  if(!rental||!rental.isActive)throw new ConflictException('Booking is inactive or missing');
  const [property]=await tx.select().from(PropertySchema).where(and(
   eq(PropertySchema.id,rental.propertyId),eq(PropertySchema.userId,uid))).limit(1);
  if(!property)throw new NotFoundException('Property not found');
  const [rules]=await tx.select().from(PropertyContractSettingsSchema).where(and(
   eq(PropertyContractSettingsSchema.propertyId,property.id),eq(PropertyContractSettingsSchema.userId,uid))).limit(1);
  const [guestRow]=await tx.select().from(RentalGuestDetailsSchema).where(and(
   eq(RentalGuestDetailsSchema.rentalId,rental.id),eq(RentalGuestDetailsSchema.userId,uid))).limit(1);
  const [settings]=await tx.select().from(ContractSettingsSchema).where(
   eq(ContractSettingsSchema.userId,uid)).limit(1);
  const payments=await tx.select().from(RentalInstallmentSchema).where(and(
   eq(RentalInstallmentSchema.rentalId,rental.id),eq(RentalInstallmentSchema.userId,uid)))
   .orderBy(RentalInstallmentSchema.sequence);
  const [template]=revision.templateVersionId
   ?await tx.select().from(ContractTemplateVersionSchema).where(and(
    eq(ContractTemplateVersionSchema.id,revision.templateVersionId),
    eq(ContractTemplateVersionSchema.userId,uid),
    eq(ContractTemplateVersionSchema.status,'PUBLISHED'))).limit(1)
   :await tx.select().from(ContractTemplateVersionSchema).where(and(
    eq(ContractTemplateVersionSchema.userId,uid),
    eq(ContractTemplateVersionSchema.status,'PUBLISHED')))
    .orderBy(desc(ContractTemplateVersionSchema.publishedAt)).limit(1);
  if(!template)throw new ConflictException('Published contract template is required');
  const crypto=new ContractDataCrypto();
  const guest=openJson<Record<string,string>>(crypto,uid,'guest',rental.id,
   guestRow?.identityCiphertext,guestRow?.identityNonce,guestRow?.identityAuthTag,guestRow?.identityKeyVersion);
  const landlord=openJson<LandlordProfile>(crypto,uid,'landlord-profile',uid,
   settings?.profileCiphertext,settings?.profileNonce,settings?.profileAuthTag,settings?.profileKeyVersion);
  const pricing=openJson<Record<string,unknown>>(crypto,uid,'contract-snapshot',revision.id,
   revision.snapshotCiphertext,revision.snapshotNonce,revision.snapshotAuthTag,revision.snapshotKeyVersion);
  const policy=template.policySnapshot as ContractPolicy;
  const paymentDefaults=settings?.paymentDefaults as ContractPayment|undefined;
  try{
   const fullName=[rental.clientFirstName,rental.clientLastName].join(' ').trim();
   verifyGuestFinalization({...guest,fullName} as Parameters<typeof verifyGuestFinalization>[0]);
   validateClauses(template.clauses as ContractClause[],true);
   validateLandlordForPublish(landlord,policy,paymentDefaults!);
   const total=strictCents(rental.revenue);
   verifyInstallments(total,payments.map(p=>p.agreedCents));
   if(!rental.startDate||!rental.endDate||rental.startDate>=rental.endDate||
    rental.guests<1||!Number.isSafeInteger(rental.guests))throw new Error('Invalid booking');
   if(!rules||rules.includedOccupancy===null||rules.maximumOccupancy===null||
    rules.extraGuestRateCents===null||!rules.checkInTime||!rules.checkOutTime||
    rental.guests>rules.maximumOccupancy||!property.address)throw new Error('Incomplete property');
   if(payments.filter(p=>p.isDeposit).length>1||payments.some((p,i)=>
    p.sequence!==i+1||(!p.dueDate&&!p.dueEvent)||!!p.dueDate&&!!p.dueEvent||
    !p.paymentMethod||!paymentDefaults?.acceptedMethods.includes(p.paymentMethod)))
    throw new Error('Invalid installments');
   if(typeof pricing.baseRevenueCents!=='number'||typeof pricing.chargedExtraCents!=='number'||
    pricing.baseRevenueCents+pricing.chargedExtraCents!==total)throw new Error('Pricing mismatch');
  }catch{throw new ConflictException('Complete and verify guest, property, owner, pricing and installments');}
  const preview=renderContractPreview({
   template:template.clauses as ContractClause[],landlord,guest,
   rental:{clientFirstName:rental.clientFirstName,clientLastName:rental.clientLastName,
    startDate:rental.startDate,endDate:rental.endDate,guests:rental.guests,revenue:rental.revenue},
   property:{address:property.address},
   propertyRules:{checkInTime:rules?.checkInTime??null,checkOutTime:rules?.checkOutTime??null,
    includedOccupancy:rules?.includedOccupancy??null,maximumOccupancy:rules?.maximumOccupancy??null,
    extraGuestRateCents:rules?.extraGuestRateCents??null},
   policy,installments:payments});
  if(!preview.ready||preview.missing.length||preview.clauses.length<17||
   preview.clauses.some(c=>c.body.includes('[PENDENTE:')))
   throw new ConflictException('Contract preview has unresolved placeholders');
  const snapshot={schemaVersion:1,contractId:id,rentalId:rental.id,
   revisionId:revision.id,version:revision.versionNumber,templateId:template.id,
   templateVersion:template.versionNumber,landlord,
   guest:{...guest,cpf:guest.cpf,fullName:[rental.clientFirstName,rental.clientLastName].join(' ').trim()},
   booking:{propertyId:property.id,startDate:rental.startDate,endDate:rental.endDate,
    guests:rental.guests,totalCents:strictCents(rental.revenue)},
   property:{id:property.id,name:property.name,address:property.address},
   propertyRules:rules,pricing,policy,
   installments:payments.map(p=>({sequence:p.sequence,agreedCents:p.agreedCents,
    dueDate:p.dueDate,dueEvent:p.dueEvent,paymentMethod:p.paymentMethod,
    isDeposit:p.isDeposit,receivedCents:p.receivedCents,paidAt:p.paidAt?.toISOString()??null})),
   clauses:preview.clauses};
  return {revision,template,preview,snapshot};
 }
 async review(uid:string,id:string){
  if(!uid)throw new NotFoundException();
  return this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}),hashtext(${id}))`);
   const p=await this.load(tx,uid,id);
   return {ready:true,revisionId:p.revision.id,version:p.revision.versionNumber,
    reviewToken:signedReview(uid,p.snapshot)};
  });
 }
 async finalize(uid:string,id:string,reviewToken:string,confirm:boolean){
  if(!uid)throw new NotFoundException();
  if(confirm!==true)throw new BadRequestException('Explicit confirmation is required');
  return this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}),hashtext(${id}))`);
   const p=await this.load(tx,uid,id);
   const expected=signedReview(uid,p.snapshot);
   if(!/^[a-f0-9]{64}$/.test(reviewToken)||!
    timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(reviewToken,'hex')))
    throw new ConflictException('Contract changed; repeat final review');
   const finalizedAt=new Date();
   const archive={...p.snapshot,finalizedAt:finalizedAt.toISOString(),signatureStatus:'UNSIGNED'};
   const bytes=await renderFinalContractPdf({contractId:id,version:p.revision.versionNumber,
    finalizedAt,clauses:p.preview.clauses,summary:{
     landlord:p.snapshot.landlord.fullName!,landlordCpf:p.snapshot.landlord.cpf!,
     guest:p.snapshot.guest.fullName,guestCpf:p.snapshot.guest.cpf,
     property:p.snapshot.property.address!,checkIn:p.snapshot.booking.startDate,
     checkOut:p.snapshot.booking.endDate,guests:p.snapshot.booking.guests,
     totalCents:p.snapshot.booking.totalCents}});
   const crypto=new ContractDataCrypto();
   const snap=crypto.seal(Buffer.from(JSON.stringify(archive),'utf8'),uid,
    'contract-snapshot',p.revision.id);
   const pdf=crypto.seal(bytes,uid,'contract-pdf',p.revision.id);
   const [changed]=await tx.update(ContractRevisionSchema).set({
    status:'FINALIZED',templateVersionId:p.template.id,
    snapshotCiphertext:snap.ciphertext,snapshotNonce:snap.nonce,
    snapshotAuthTag:snap.authTag,snapshotKeyVersion:snap.keyVersion,snapshotSha256:snap.sha256,
    pdfCiphertext:pdf.ciphertext,pdfNonce:pdf.nonce,pdfAuthTag:pdf.authTag,
    pdfKeyVersion:pdf.keyVersion,pdfSha256:pdf.sha256,finalizedAt
   }).where(and(eq(ContractRevisionSchema.id,p.revision.id),
    eq(ContractRevisionSchema.userId,uid),eq(ContractRevisionSchema.status,'DRAFT')))
    .returning({id:ContractRevisionSchema.id});
   if(!changed)throw new ConflictException('Already finalized');
   await tx.insert(ContractAuditEventSchema).values({userId:uid,actorId:uid,
    action:'FINALIZE',targetType:'CONTRACT',targetId:id,outcome:'SUCCESS'});
   return {id,revisionId:changed.id,status:'FINALIZED',finalizedAt:finalizedAt.toISOString(),
    pdfSha256:pdf.sha256,snapshotSha256:snap.sha256,signatureStatus:'UNSIGNED'};
  });
 }
}
