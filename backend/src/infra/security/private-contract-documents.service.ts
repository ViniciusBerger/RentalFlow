import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../persistence/database.module';
import { ContractRevisionSchema } from '../persistence/schemas/contract-revision-schema';
import { ContractDataCrypto } from './encrypted-data';
import { requireContractOwner } from './contract-authorization';

@Injectable()
export class PrivateContractDocumentsService {
 constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}
 async readFinalPdf(ownerUid:string,contractId:string,revisionId:string): Promise<Buffer> {
   if (!ownerUid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contractId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(revisionId)) throw new NotFoundException('Contract not found');
   const [row]=await this.db.select().from(ContractRevisionSchema).where(and(
     eq(ContractRevisionSchema.userId,ownerUid), eq(ContractRevisionSchema.contractId,contractId),
     eq(ContractRevisionSchema.id,revisionId), eq(ContractRevisionSchema.status,'FINALIZED')
   )).limit(1);
   if (!row || !row.pdfCiphertext || !row.pdfNonce || !row.pdfAuthTag || !row.pdfKeyVersion || !row.pdfSha256) throw new NotFoundException('Contract not found');
   requireContractOwner(ownerUid,row.userId);
   const bytes=new ContractDataCrypto().open({
     ciphertext:row.pdfCiphertext,nonce:row.pdfNonce,authTag:row.pdfAuthTag,
     keyVersion:row.pdfKeyVersion,sha256:row.pdfSha256
   },ownerUid,'contract-pdf',row.id);
   if (bytes.length<5 || bytes.subarray(0,5).toString('ascii')!=='%PDF-') throw new Error('Stored contract PDF is invalid');
   return bytes;
 }
}
