import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import {ContractCancellationService} from './contract-cancellation.service';

const uid='verified-owner',id='33333333-3333-4333-8333-333333333333';
const rentalId='22222222-2222-4222-8222-222222222222';
const contract={id,rentalId,userId:uid};
const rental={id:rentalId,userId:uid,propertyId:'property',startDate:'2027-04-01',endDate:'2027-04-03',
 guests:2,clientFirstName:'Ana',clientLastName:'Silva',revenue:400,profit:300,fee:100,isActive:true};
const revision={id:'44444444-4444-4444-8444-444444444444',status:'FINALIZED',version:1};
const payments=[{id:'55555555-5555-4555-8555-555555555555',sequence:1,agreedCents:40000,
 receivedCents:5000,paidAt:null}];
function fixture(sequence:any[][]){
 const results=sequence.map(row=>[...row]);
 const inserted:any[]=[];
 const builder:any={};
 builder.from=jest.fn(()=>builder);
 builder.where=jest.fn(()=>builder);
 builder.orderBy=jest.fn(()=>builder);
 builder.limit=jest.fn(()=>Promise.resolve(results.shift()??[]));
 builder.then=(accept:any,reject:any)=>Promise.resolve(results.shift()??[]).then(accept,reject);
 const tx:any={
  select:jest.fn(()=>builder),execute:jest.fn().mockResolvedValue(undefined),
  insert:jest.fn(()=>({values:jest.fn((v:any)=>{inserted.push(v);return Promise.resolve()})})),
  update:jest.fn(()=>({set:jest.fn(()=>({where:jest.fn(()=>({
   returning:jest.fn().mockResolvedValue([{id:rentalId}])
  }))}))}))
 };
 tx.transaction=jest.fn(async(fn:any)=>fn(tx));
 return {tx,inserted};
}
describe('secure contract cancellation review and commit',()=>{
 const originalKeys=process.env.CONTRACT_DATA_KEYS,originalVersion=process.env.CONTRACT_ACTIVE_KEY_VERSION;
 beforeAll(()=>{
  process.env.CONTRACT_ACTIVE_KEY_VERSION='v1';
  process.env.CONTRACT_DATA_KEYS=JSON.stringify({v1:Buffer.alloc(32,7).toString('base64')});
 });
 afterAll(()=>{
  if(originalKeys===undefined)delete process.env.CONTRACT_DATA_KEYS;
  else process.env.CONTRACT_DATA_KEYS=originalKeys;
  if(originalVersion===undefined)delete process.env.CONTRACT_ACTIVE_KEY_VERSION;
  else process.env.CONTRACT_ACTIVE_KEY_VERSION=originalVersion;
 });
 const rows=()=>[[contract],[rental],[revision],payments];
 it('prepares signed state-bound review without exposing customer identity',async()=>{
  const {tx}=fixture(rows());
  const result=await new ContractCancellationService(tx).review(uid,id);
  expect(result.reviewToken).toMatch(/^[a-f0-9]{64}$/);
  expect(result.revenueExcludedCents).toBe(40000);
  expect(result.profitExcludedCents).toBe(30000);
  expect(result.recordedReceivedCents).toBe(5000);
  expect(result.refundIssued).toBe(false);
  expect(JSON.stringify(result)).not.toContain('Silva');
  expect(tx.update).not.toHaveBeenCalled();
 });
 it('rejects forgery or stale tokens before any writes',async()=>{
  const {tx,inserted}=fixture(rows());
  await expect(new ContractCancellationService(tx).cancel(uid,id,'0'.repeat(64),true))
   .rejects.toBeInstanceOf(ConflictException);
  expect(inserted).toHaveLength(0);
  expect(tx.update).not.toHaveBeenCalled();
 });
 it('requires explicit confirmation and valid token shape',async()=>{
  const {tx}=fixture([]);
  const service=new ContractCancellationService(tx);
  await expect(service.cancel(uid,id,'b'.repeat(64),false)).rejects.toBeInstanceOf(BadRequestException);
  await expect(service.cancel(uid,id,'bad',true)).rejects.toBeInstanceOf(BadRequestException);
  expect(tx.transaction).not.toHaveBeenCalled();
 });
 it('returns 404 for another tenant and fails closed for an already cancelled booking',async()=>{
  const first=fixture([[]]);
  await expect(new ContractCancellationService(first.tx).review('other-owner',id))
   .rejects.toBeInstanceOf(NotFoundException);
  const second=fixture([[contract],[{...rental,isActive:false}]]);
  await expect(new ContractCancellationService(second.tx).cancel(uid,id,'a'.repeat(64),true))
   .rejects.toBeInstanceOf(ConflictException);
  expect(second.inserted).toHaveLength(0);
 });
 it('uses unchanged verified review token, writes only protected metadata and does not move money',async()=>{
  const review=await new ContractCancellationService(fixture(rows()).tx).review(uid,id);
  const {tx,inserted}=fixture([...rows(),...rows()]);
  const result=await new ContractCancellationService(tx).cancel(uid,id,review.reviewToken,true);
  expect(result).toMatchObject({cancelled:true,refundIssued:false,revenueExcludedCents:40000,
   profitExcludedCents:30000,recordedReceivedCents:5000});
  expect(tx.update).toHaveBeenCalledTimes(1);
  const authorization=inserted.find(x=>x.excludedRevenueCents===40000);
  expect(authorization).toMatchObject({contractId:id,rentalId,userId:uid,actorId:uid,
   excludedRevenueCents:40000,excludedProfitCents:30000});
  const audit=inserted.find(x=>x.action==='CANCEL_CONTRACT_BOOKING');
  expect(audit).toMatchObject({userId:uid,actorId:uid,targetId:id,outcome:'SUCCESS'});
  expect(JSON.stringify(inserted)).not.toContain('Ana');
  expect(JSON.stringify(inserted)).not.toContain('Silva');
 });
});
