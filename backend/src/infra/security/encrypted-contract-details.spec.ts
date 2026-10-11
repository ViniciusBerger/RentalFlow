import { EncryptedContractDetailsService } from './encrypted-contract-details.service';
describe('encrypted guest details ownership',()=>{
 it('rejects an unowned booking before trying to insert encrypted guest data',async()=>{
  const limit=jest.fn().mockResolvedValue([]);
  const insert=jest.fn();
  const transaction=jest.fn(async fn=>fn({select:()=>({from:()=>({where:()=>({limit})})}),insert}));
  const service=new EncryptedContractDetailsService({transaction} as any);
  const originalKeys=process.env.CONTRACT_DATA_KEYS;
  const originalVersion=process.env.CONTRACT_ACTIVE_KEY_VERSION;
  process.env.CONTRACT_DATA_KEYS=JSON.stringify({v1:Buffer.alloc(32,7).toString('base64')});
  process.env.CONTRACT_ACTIVE_KEY_VERSION='v1';
  try {
   await expect(service.saveGuestDraft('owner','550e8400-e29b-41d4-a716-446655440000',{cpf:'52998224725'})).rejects.toThrow('Rental not found');
   expect(insert).not.toHaveBeenCalled();
  } finally {
   if(originalKeys===undefined)delete process.env.CONTRACT_DATA_KEYS;else process.env.CONTRACT_DATA_KEYS=originalKeys;
   if(originalVersion===undefined)delete process.env.CONTRACT_ACTIVE_KEY_VERSION;else process.env.CONTRACT_ACTIVE_KEY_VERSION=originalVersion;
  }
 });
});
