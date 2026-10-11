import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../persistence/database.module';
import { RentalSchema } from '../persistence/schemas/rental-schema';
import { RentalGuestDetailsSchema } from '../persistence/schemas/rental-guest-details-schema';
import { ContractSettingsSchema } from '../persistence/schemas/contract-settings-schema';
import { ContractAuditEventSchema } from '../persistence/schemas/contract-security-schema';
import { ContractDataCrypto } from './encrypted-data';

/** Future controllers pass only the UID from the verified HttpOnly session. */
@Injectable()
export class EncryptedContractDetailsService {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}
  private validateFields(value:unknown,allowed:readonly string[]):Record<string,string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid contract identity fields');
    const pairs=Object.entries(value);
    if(pairs.some(([key,item])=>!allowed.includes(key) || typeof item !== 'string' || item.length>500)) {
      throw new Error('Invalid contract identity fields');
    }
    return Object.fromEntries(pairs) as Record<string,string>;
  }
  async saveGuestDraft(ownerUid:string,rentalId:string,form:Record<string,string>):Promise<void> {
    const allowed=['cpf','rg','nationality','maritalStatus','address','phone','email'];
    const validated=this.validateFields(form,allowed);
    const crypto=new ContractDataCrypto();
    await this.db.transaction(async tx=>{
      const [owned]=await tx.select({id:RentalSchema.id}).from(RentalSchema)
        .where(and(eq(RentalSchema.id,rentalId),eq(RentalSchema.userId,ownerUid))).limit(1);
      if(!owned) throw new NotFoundException('Rental not found');
      const sealed=crypto.seal(Buffer.from(JSON.stringify(validated),'utf8'),ownerUid,'guest',rentalId);
      await tx.insert(RentalGuestDetailsSchema).values({
        rentalId,userId:ownerUid,identityCiphertext:sealed.ciphertext,identityNonce:sealed.nonce,
        identityAuthTag:sealed.authTag,identityKeyVersion:sealed.keyVersion,
      }).onConflictDoUpdate({target:RentalGuestDetailsSchema.rentalId,set:{
        identityCiphertext:sealed.ciphertext,identityNonce:sealed.nonce,
        identityAuthTag:sealed.authTag,identityKeyVersion:sealed.keyVersion,updatedAt:new Date(),
      }});
      await tx.insert(ContractAuditEventSchema).values({userId:ownerUid,actorId:ownerUid,
        action:'UPDATE_GUEST',targetType:'RENTAL',targetId:rentalId,outcome:'SUCCESS'});
    });
  }
  async readGuestDraft(ownerUid:string,rentalId:string):Promise<Record<string,string>|null> {
    const [row]=await this.db.select().from(RentalGuestDetailsSchema).where(and(
      eq(RentalGuestDetailsSchema.rentalId,rentalId),eq(RentalGuestDetailsSchema.userId,ownerUid))).limit(1);
    if(!row?.identityCiphertext || !row.identityNonce || !row.identityAuthTag || !row.identityKeyVersion) return null;
    const plain=new ContractDataCrypto().open({ciphertext:row.identityCiphertext,nonce:row.identityNonce,
      authTag:row.identityAuthTag,keyVersion:row.identityKeyVersion},ownerUid,'guest',rentalId);
    return JSON.parse(plain.toString('utf8')) as Record<string,string>;
  }
  async saveLandlordProfile(ownerUid:string,form:Record<string,string>):Promise<void> {
    const allowed=['fullName','cpf','rg','address','phone','email','pixKey','bankName','bankAgency','bankAccount'];
    const validated=this.validateFields(form,allowed);
    const sealed=new ContractDataCrypto().seal(Buffer.from(JSON.stringify(validated),'utf8'),ownerUid,'landlord-profile',ownerUid);
    await this.db.transaction(async tx=>{
      await tx.insert(ContractSettingsSchema).values({userId:ownerUid,
        profileCiphertext:sealed.ciphertext,profileNonce:sealed.nonce,
        profileAuthTag:sealed.authTag,profileKeyVersion:sealed.keyVersion,
      }).onConflictDoUpdate({target:ContractSettingsSchema.userId,set:{
        profileCiphertext:sealed.ciphertext,profileNonce:sealed.nonce,
        profileAuthTag:sealed.authTag,profileKeyVersion:sealed.keyVersion,updatedAt:new Date(),
      }});
      await tx.insert(ContractAuditEventSchema).values({userId:ownerUid,actorId:ownerUid,
        action:'UPDATE_GUEST',targetType:'TEMPLATE',outcome:'SUCCESS'});
    });
  }
  async readLandlordProfile(ownerUid:string):Promise<Record<string,string>|null> {
    const [row]=await this.db.select().from(ContractSettingsSchema).where(eq(ContractSettingsSchema.userId,ownerUid)).limit(1);
    if(!row?.profileCiphertext || !row.profileNonce || !row.profileAuthTag || !row.profileKeyVersion) return null;
    const plain=new ContractDataCrypto().open({ciphertext:row.profileCiphertext,nonce:row.profileNonce,
      authTag:row.profileAuthTag,keyVersion:row.profileKeyVersion},ownerUid,'landlord-profile',ownerUid);
    return JSON.parse(plain.toString('utf8')) as Record<string,string>;
  }
}
