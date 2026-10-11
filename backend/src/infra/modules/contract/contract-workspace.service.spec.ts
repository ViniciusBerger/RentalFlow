import {createHash} from 'node:crypto';
import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import {PgDialect} from 'drizzle-orm/pg-core';
import {ContractWorkspaceService} from './contract-workspace.service';

const contractId='33333333-3333-4333-8333-333333333333';
const rentalId='22222222-2222-4222-8222-222222222222';
const revisionId='44444444-4444-4444-8444-444444444444';
const uid='owner-a';
function dbStub(results:any[][]){
 const pulled=()=>Promise.resolve(results.shift()??[]);
 const builder:any={};
 builder.from=jest.fn(()=>builder);
 builder.where=jest.fn(()=>builder);
 builder.innerJoin=jest.fn(()=>builder);
 builder.limit=jest.fn(pulled);
 builder.orderBy=jest.fn(()=>({limit:builder.limit,then:(resolve:any,reject:any)=>pulled().then(resolve,reject)}));
 const values=jest.fn(()=>({onConflictDoUpdate:jest.fn().mockResolvedValue(undefined),
  then:(resolve:any)=>Promise.resolve(undefined).then(resolve)}));
 const db:any={
  select:jest.fn(()=>builder),execute:jest.fn().mockResolvedValue(undefined),
  delete:jest.fn(()=>({where:jest.fn().mockResolvedValue(undefined)})),
  insert:jest.fn(()=>({values})),
  transaction:jest.fn((fn:any)=>fn(db))
 };
 return {db,values,builder};
}
const contract={id:contractId,rentalId,userId:uid};
const rental={id:rentalId,userId:uid,revenue:100};
const revision={id:revisionId,status:'DRAFT',contractId,userId:uid,versionNumber:1};
const stableToken=()=>createHash('sha256').update(JSON.stringify({
 revisionId,nonce:'',ciphertext:'',payments:[]
})).digest('hex');
describe('draft contract write isolation',()=>{
 const env={...process.env};
 beforeEach(()=>{process.env.CONTRACT_ACTIVE_KEY_VERSION='v1';
  process.env.CONTRACT_DATA_KEYS=JSON.stringify({v1:Buffer.alloc(32,21).toString('base64')});
 });
 afterAll(()=>{process.env={...env};});
 it('returns 404 for a contract not owned by the session before writes',async()=>{
  const {db,builder}=dbStub([[]]);
  await expect(new ContractWorkspaceService(db).save(uid,contractId,{
   editToken:stableToken(),guest:{cpf:'52998224725'}
  } as any)).rejects.toBeInstanceOf(NotFoundException);
  expect(db.insert).not.toHaveBeenCalled();
  const sql=new PgDialect().sqlToQuery(builder.where.mock.calls[0][0]);
  expect(sql.params).toContain(uid);
  expect(sql.params).toContain(contractId);
 });
 it('rejects editing any READY/FINALIZED revision',async()=>{
  const {db}=dbStub([[contract],[rental],[{...revision,status:'FINALIZED'}]]);
  await expect(new ContractWorkspaceService(db).save(uid,contractId,{
   editToken:stableToken(),guest:{address:'Any'}
  } as any)).rejects.toBeInstanceOf(ConflictException);
  expect(db.insert).not.toHaveBeenCalled();
 });
 it('stale edit tokens prevent lost writes or replay',async()=>{
  const {db}=dbStub([[contract],[rental],[revision],[],[]]);
  await expect(new ContractWorkspaceService(db).save(uid,contractId,{
   editToken:'0'.repeat(64),guest:{phone:'1234567890'}
  } as any)).rejects.toBeInstanceOf(ConflictException);
  expect(db.delete).not.toHaveBeenCalled();
  expect(db.insert).not.toHaveBeenCalled();
 });
 it('cannot rewrite the booking total through installments',async()=>{
  const {db}=dbStub([[contract],[rental],[revision],[],[]]);
  await expect(new ContractWorkspaceService(db).save(uid,contractId,{
   editToken:stableToken(),installments:[{agreedCents:9999}]
  } as any)).rejects.toBeInstanceOf(BadRequestException);
  expect(db.delete).not.toHaveBeenCalled();
 });
 it('requires an actual guest or payment field change',async()=>{
  const {db}=dbStub([]);
  await expect(new ContractWorkspaceService(db).save(uid,contractId,{
   editToken:stableToken()
  } as any)).rejects.toBeInstanceOf(BadRequestException);
  expect(db.transaction).not.toHaveBeenCalled();
 });
 it('seals identity and logs a PII-free audit on a scoped draft save',async()=>{
  const {db,values}=dbStub([[contract],[rental],[revision],[],[]]);
  const service=new ContractWorkspaceService(db);
  jest.spyOn(service,'detail').mockResolvedValue({saved:true} as any);
  const saved=await service.save(uid,contractId,{
   editToken:stableToken(),guest:{cpf:'52998224725',phone:'+5527999999999'}
  } as any);
  expect(saved).toEqual({saved:true});
  const sent=values.mock.calls.map(x=>x[0]);
  const guest=sent.find(x=>x?.identityCiphertext);
  expect(guest).toMatchObject({userId:uid,rentalId});
  expect(Buffer.isBuffer(guest.identityCiphertext)).toBe(true);
  expect(JSON.stringify(guest)).not.toContain('52998224725');
  const audit=sent.find(x=>x?.action==='EDIT_CONTRACT_DRAFT');
  expect(audit).toMatchObject({userId:uid,actorId:uid,targetId:contractId,outcome:'SUCCESS'});
  expect(db.delete).not.toHaveBeenCalled();
 });
});
