import { PrivateContractDocumentsService } from './private-contract-documents.service';
describe('private contract document reads',()=>{
 it('rejects unknown or other-tenant finalized revisions before key access',async()=>{
  const limit=jest.fn().mockResolvedValue([]);
  const db={select:()=>({from:()=>({where:()=>({limit})})})} as any;
  const service=new PrivateContractDocumentsService(db);
  await expect(service.readFinalPdf('tenant-a','550e8400-e29b-41d4-a716-446655440000','550e8400-e29b-41d4-a716-446655440001')).rejects.toThrow('Contract not found');
  expect(limit).toHaveBeenCalledTimes(1);
  await expect(service.readFinalPdf('tenant-a','wrong','wrong')).rejects.toThrow();
 });
});
