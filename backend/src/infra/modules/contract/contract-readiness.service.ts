import {Inject,Injectable} from '@nestjs/common';
import {and,count,desc,eq,inArray} from 'drizzle-orm';
import {NodePgDatabase} from 'drizzle-orm/node-postgres';
import {DRIZZLE} from '../../persistence/database.module';
import {ContractSettingsSchema} from '../../persistence/schemas/contract-settings-schema';
import {ContractTemplateSchema} from '../../persistence/schemas/contract-template-schema';
import {ContractTemplateVersionSchema} from '../../persistence/schemas/contract-template-version-schema';
import {PropertySchema} from '../../persistence/schemas/property-schema';
import {PropertyContractSettingsSchema} from '../../persistence/schemas/property-contract-settings-schema';
import {ContractRevisionSchema} from '../../persistence/schemas/contract-revision-schema';
import {ContractSchema} from '../../persistence/schemas/contract-schema';
import {RentalSchema} from '../../persistence/schemas/rental-schema';
import {ContractDataCrypto} from '../../security/encrypted-data';
import {defaultPayment,defaultPolicy,type LandlordProfile,type ContractClause,type ContractPayment,type ContractPolicy} from '../../../core/domain/contract/contract-questionnaire';
import {readinessIssues} from '../../../core/domain/contract/contract-readiness';

@Injectable()
export class ContractReadinessService {
 constructor(@Inject(DRIZZLE) private readonly db:NodePgDatabase){}
 async status(uid:string){
  const [settings]=await this.db.select().from(ContractSettingsSchema).where(eq(ContractSettingsSchema.userId,uid)).limit(1);
  let landlord:LandlordProfile={};
  if(settings?.profileCiphertext){
   if(!settings.profileNonce||!settings.profileAuthTag||!settings.profileKeyVersion)throw new Error('Incomplete encrypted landlord profile');
   landlord=JSON.parse(new ContractDataCrypto().open({
    ciphertext:settings.profileCiphertext,nonce:settings.profileNonce,authTag:settings.profileAuthTag,
    keyVersion:settings.profileKeyVersion
   },uid,'landlord-profile',uid).toString('utf8')) as LandlordProfile;
  }
  const [template]=await this.db.select({id:ContractTemplateSchema.id}).from(ContractTemplateSchema)
   .where(and(eq(ContractTemplateSchema.userId,uid),eq(ContractTemplateSchema.isDefault,true))).limit(1);
  const [published]=template?await this.db.select({clauses:ContractTemplateVersionSchema.clauses})
   .from(ContractTemplateVersionSchema).where(and(
    eq(ContractTemplateVersionSchema.userId,uid),eq(ContractTemplateVersionSchema.templateId,template.id),
    eq(ContractTemplateVersionSchema.status,'PUBLISHED')))
   .orderBy(desc(ContractTemplateVersionSchema.versionNumber)).limit(1):[];
  const [properties,rows,[drafts]]=await Promise.all([
   this.db.select({id:PropertySchema.id,name:PropertySchema.name,address:PropertySchema.address}).from(PropertySchema)
    .where(and(eq(PropertySchema.userId,uid),eq(PropertySchema.isActive,true))),
   this.db.select().from(PropertyContractSettingsSchema).where(eq(PropertyContractSettingsSchema.userId,uid)),
   this.db.select({total:count()}).from(ContractRevisionSchema)
    .innerJoin(ContractSchema,and(eq(ContractRevisionSchema.contractId,ContractSchema.id),
     eq(ContractSchema.userId,uid)))
    .innerJoin(RentalSchema,and(eq(ContractSchema.rentalId,RentalSchema.id),
     eq(RentalSchema.userId,uid)))
    .where(and(eq(ContractRevisionSchema.userId,uid),
     inArray(ContractRevisionSchema.status,['DRAFT','READY']),eq(RentalSchema.isActive,true)))
  ]);
  const byProperty=new Map(rows.map(r=>[r.propertyId,r]));
  const issues=readinessIssues({
   configured:!!settings,
   landlord,policy:(settings?.policyConfig??defaultPolicy) as ContractPolicy,
   payment:(settings?.paymentDefaults??defaultPayment) as ContractPayment,
   publishedClauses:(published?.clauses??null) as ContractClause[]|null,
   properties:properties.map(p=>{
    const s=byProperty.get(p.id);
    return {id:p.id,name:p.name,address:p.address,settings:s?{
     includedOccupancy:s.includedOccupancy,maximumOccupancy:s.maximumOccupancy,
     extraGuestRateCents:s.extraGuestRateCents,checkInTime:s.checkInTime,checkOutTime:s.checkOutTime
    }:null};
   }),draftCount:drafts?.total??0
  });
  // Never return identity, payment credentials, clause contents or PII.
  return {ready:issues.length===0,issues};
 }
}
