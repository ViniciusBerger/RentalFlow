import {BadRequestException, ConflictException, Injectable, Inject, NotFoundException} from '@nestjs/common';
import {and, asc, desc, eq, sql} from 'drizzle-orm';
import {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {DRIZZLE} from '../../persistence/database.module';
import {ContractSettingsSchema} from '../../persistence/schemas/contract-settings-schema';
import {ContractTemplateSchema} from '../../persistence/schemas/contract-template-schema';
import {ContractTemplateVersionSchema} from '../../persistence/schemas/contract-template-version-schema';
import {PropertyContractSettingsSchema} from '../../persistence/schemas/property-contract-settings-schema';
import {PropertySchema} from '../../persistence/schemas/property-schema';
import {ContractAuditEventSchema} from '../../persistence/schemas/contract-security-schema';
import {ContractDataCrypto} from '../../security/encrypted-data';
import {safeClauseText} from '../../security/secure-clause-text';
import {defaultPayment,defaultPolicy,emptyContractClauses,validateClauses,validateLandlordForPublish,
 type ContractClause,type ContractPolicy,type ContractPayment,type LandlordProfile} from '../../../core/domain/contract/contract-questionnaire';

const profileColumns = {
 profileCiphertext:ContractSettingsSchema.profileCiphertext,
 profileNonce:ContractSettingsSchema.profileNonce,
 profileAuthTag:ContractSettingsSchema.profileAuthTag,
 profileKeyVersion:ContractSettingsSchema.profileKeyVersion
};
@Injectable()
export class ContractQuestionnaireService {
 constructor(@Inject(DRIZZLE) private readonly db:NodePgDatabase){}
 private unpack(row:{profileCiphertext:Buffer|null;profileNonce:Buffer|null;profileAuthTag:Buffer|null;profileKeyVersion:string|null}|undefined,uid:string):LandlordProfile {
  if(!row?.profileCiphertext||!row.profileNonce||!row.profileAuthTag||!row.profileKeyVersion)return {};
  return JSON.parse(new ContractDataCrypto().open({
   ciphertext:row.profileCiphertext,nonce:row.profileNonce,authTag:row.profileAuthTag,keyVersion:row.profileKeyVersion
  },uid,'landlord-profile',uid).toString('utf8')) as LandlordProfile;
 }
 async settings(uid:string){
  const [row]=await this.db.select().from(ContractSettingsSchema).where(eq(ContractSettingsSchema.userId,uid)).limit(1);
  return {landlord:this.unpack(row,uid),policy:row?.policyConfig&&Object.keys(row.policyConfig).length?row.policyConfig:defaultPolicy,
   payment:row?.paymentDefaults&&Object.keys(row.paymentDefaults).length?row.paymentDefaults:defaultPayment,
   configured:!!row};
 }
 async saveSettings(uid:string,landlord:LandlordProfile,policy:ContractPolicy,payment:ContractPayment){
  if(payment.acceptedMethods.length!==new Set(payment.acceptedMethods).size)throw new BadRequestException('Duplicate payment methods');
  const profile=JSON.stringify(landlord);
  // Prevent storing arbitrary payloads or policy JSON blobs via a frontend workaround.
  if(profile.length>4000)throw new BadRequestException('Invalid landlord profile');
  const cipher=new ContractDataCrypto().seal(Buffer.from(profile,'utf8'),uid,'landlord-profile',uid);
  await this.db.transaction(async tx=>{
   await tx.insert(ContractSettingsSchema).values({userId:uid,
    profileCiphertext:cipher.ciphertext,profileNonce:cipher.nonce,profileAuthTag:cipher.authTag,
    profileKeyVersion:cipher.keyVersion,policyConfig:policy as unknown as Record<string,unknown>,
    paymentDefaults:payment as unknown as Record<string,unknown>
   }).onConflictDoUpdate({target:ContractSettingsSchema.userId,set:{
    profileCiphertext:cipher.ciphertext,profileNonce:cipher.nonce,profileAuthTag:cipher.authTag,
    profileKeyVersion:cipher.keyVersion,policyConfig:policy as unknown as Record<string,unknown>,
    paymentDefaults:payment as unknown as Record<string,unknown>,updatedAt:new Date()
   }});
   await tx.insert(ContractAuditEventSchema).values({userId:uid,actorId:uid,action:'UPDATE_LANDLORD',targetType:'TEMPLATE',outcome:'SUCCESS'});
  });
  return {saved:true};
 }
 async template(uid:string){
  const [template]=await this.db.select().from(ContractTemplateSchema)
   .where(and(eq(ContractTemplateSchema.userId,uid),eq(ContractTemplateSchema.isDefault,true))).limit(1);
  if(!template)return {draft:null,published:null,scaffold:emptyContractClauses()};
  const [draft]=await this.db.select().from(ContractTemplateVersionSchema)
   .where(and(eq(ContractTemplateVersionSchema.userId,uid),eq(ContractTemplateVersionSchema.templateId,template.id),
     eq(ContractTemplateVersionSchema.status,'DRAFT'))).limit(1);
  const [published]=await this.db.select().from(ContractTemplateVersionSchema)
   .where(and(eq(ContractTemplateVersionSchema.userId,uid),eq(ContractTemplateVersionSchema.templateId,template.id),
     eq(ContractTemplateVersionSchema.status,'PUBLISHED'))).orderBy(desc(ContractTemplateVersionSchema.versionNumber)).limit(1);
  return {draft:draft?{id:draft.id,versionNumber:draft.versionNumber,clauses:draft.clauses}:null,
   published:published?{id:published.id,versionNumber:published.versionNumber,publishedAt:published.publishedAt,clauses:published.clauses}:null,
   scaffold:emptyContractClauses()};
 }
 async saveDraft(uid:string,clauses:ContractClause[]){
  const validated=validateClauses(clauses);
  return this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}))`);
   let [template]=await tx.select().from(ContractTemplateSchema)
     .where(and(eq(ContractTemplateSchema.userId,uid),eq(ContractTemplateSchema.isDefault,true))).limit(1);
   if(!template) {
    [template]=await tx.insert(ContractTemplateSchema).values({userId:uid,name:'Contrato de temporada',isDefault:true}).returning();
   }
   const [draft]=await tx.select().from(ContractTemplateVersionSchema).where(and(
    eq(ContractTemplateVersionSchema.userId,uid),eq(ContractTemplateVersionSchema.templateId,template.id),
    eq(ContractTemplateVersionSchema.status,'DRAFT'))).limit(1);
   if(draft){
     await tx.update(ContractTemplateVersionSchema).set({clauses:validated}).where(and(
      eq(ContractTemplateVersionSchema.id,draft.id),eq(ContractTemplateVersionSchema.userId,uid),
      eq(ContractTemplateVersionSchema.status,'DRAFT')));
     return {id:draft.id,versionNumber:draft.versionNumber};
   }
   const [last]=await tx.select({number:ContractTemplateVersionSchema.versionNumber,clauses:ContractTemplateVersionSchema.clauses})
    .from(ContractTemplateVersionSchema).where(and(eq(ContractTemplateVersionSchema.templateId,template.id),
      eq(ContractTemplateVersionSchema.userId,uid))).orderBy(desc(ContractTemplateVersionSchema.versionNumber)).limit(1);
   const [created]=await tx.insert(ContractTemplateVersionSchema).values({
    templateId:template.id,userId:uid,versionNumber:(last?.number??0)+1,status:'DRAFT',clauses:validated
   }).returning({id:ContractTemplateVersionSchema.id,versionNumber:ContractTemplateVersionSchema.versionNumber});
   await tx.insert(ContractAuditEventSchema).values({userId:uid,actorId:uid,action:'CREATE_DRAFT',targetType:'TEMPLATE',targetId:template.id,outcome:'SUCCESS'});
   return created;
  });
 }
 async publish(uid:string,draftId:string){
  return this.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${uid}))`);
   const [version]=await tx.select().from(ContractTemplateVersionSchema).where(and(
    eq(ContractTemplateVersionSchema.id,draftId),eq(ContractTemplateVersionSchema.userId,uid),
    eq(ContractTemplateVersionSchema.status,'DRAFT'))).limit(1);
   if(!version)throw new ConflictException('Draft not found or already published');
   const clauses=validateClauses(version.clauses as ContractClause[],true);
   const [settings]=await tx.select({...profileColumns,policy:ContractSettingsSchema.policyConfig,payment:ContractSettingsSchema.paymentDefaults})
    .from(ContractSettingsSchema).where(eq(ContractSettingsSchema.userId,uid)).limit(1);
   if(!settings)throw new BadRequestException('Complete account questionnaire first');
   const policy=settings.policy as ContractPolicy,payment=settings.payment as ContractPayment;
   validateLandlordForPublish(this.unpack(settings,uid),policy,payment);
   // Snapshot excludes CPF, bank details and landlord address; these stay AES-sealed.
   const [published]=await tx.update(ContractTemplateVersionSchema).set({status:'PUBLISHED',
    clauses,policySnapshot:{...policy,payment},publishedAt:new Date()
   }).where(and(eq(ContractTemplateVersionSchema.id,draftId),eq(ContractTemplateVersionSchema.userId,uid),
     eq(ContractTemplateVersionSchema.status,'DRAFT'))).returning({id:ContractTemplateVersionSchema.id,versionNumber:ContractTemplateVersionSchema.versionNumber});
   if(!published)throw new ConflictException('Draft changed during publication');
   await tx.insert(ContractAuditEventSchema).values({userId:uid,actorId:uid,action:'PUBLISH_TEMPLATE',
    targetType:'TEMPLATE',targetId:version.templateId,outcome:'SUCCESS'});
   return published;
  });
 }
 async propertySettings(uid:string,propertyId:string){
  const [property]=await this.db.select({id:PropertySchema.id,name:PropertySchema.name,address:PropertySchema.address})
   .from(PropertySchema).where(and(eq(PropertySchema.id,propertyId),eq(PropertySchema.userId,uid),
     eq(PropertySchema.isActive,true))).limit(1);
  if(!property)throw new NotFoundException('Property not found');
  const [settings]=await this.db.select().from(PropertyContractSettingsSchema).where(and(
   eq(PropertyContractSettingsSchema.propertyId,propertyId),eq(PropertyContractSettingsSchema.userId,uid))).limit(1);
  return {property,settings:settings?{includedOccupancy:settings.includedOccupancy,maximumOccupancy:settings.maximumOccupancy,
   extraGuestRateCents:settings.extraGuestRateCents,checkInTime:settings.checkInTime?.slice(0,5)??null,
   checkOutTime:settings.checkOutTime?.slice(0,5)??null,providesLinen:settings.providesLinen,
   hasPool:settings.hasPool,houseRules:settings.houseRules}:null};
 }
 async savePropertySettings(uid:string,propertyId:string,input:{includedOccupancy:number;maximumOccupancy:number;
  extraGuestRateCents:number;checkInTime:string;checkOutTime:string;providesLinen:boolean;hasPool:boolean;houseRules:string[]}){
  if(input.maximumOccupancy<input.includedOccupancy||
     input.houseRules.some(r=>typeof r!=='string'||r.length>700||!r.trim())||
     input.houseRules.join('').length>6000)throw new BadRequestException('Invalid property contract settings');
  const rules=input.houseRules.map(r=>safeClauseText(r));
  return this.db.transaction(async tx=>{
   const [owned]=await tx.select({id:PropertySchema.id}).from(PropertySchema).where(and(
    eq(PropertySchema.id,propertyId),eq(PropertySchema.userId,uid),eq(PropertySchema.isActive,true))).limit(1);
   if(!owned)throw new NotFoundException('Property not found');
   await tx.insert(PropertyContractSettingsSchema).values({propertyId,userId:uid,...input,houseRules:rules})
    .onConflictDoUpdate({target:PropertyContractSettingsSchema.propertyId,set:{...input,houseRules:rules,updatedAt:new Date()}});
   await tx.insert(ContractAuditEventSchema).values({userId:uid,actorId:uid,action:'UPDATE_PROPERTY',
    targetType:'TEMPLATE',outcome:'SUCCESS'});
   return {saved:true};
  });
 }
}
