import {NotFoundException} from '@nestjs/common';
import {validate} from 'class-validator';
import {ContractCancellationController,ConfirmContractCancellationDto} from './contract-cancellation.controller';
import {ContractCancellationService} from './contract-cancellation.service';

describe('contract cancellation controller boundaries',()=>{
 const originalWorkspace=process.env.CONTRACT_WORKSPACE_ENABLED;
 const originalCancellation=process.env.CONTRACT_CANCELLATIONS_ENABLED;
 const service:any={review:jest.fn(),cancel:jest.fn()};
 const controller=new ContractCancellationController(service as ContractCancellationService);
 const req={user:{uid:'verified-account'}},id='33333333-3333-4333-8333-333333333333';
 beforeEach(()=>{jest.clearAllMocks();delete process.env.CONTRACT_WORKSPACE_ENABLED;delete process.env.CONTRACT_CANCELLATIONS_ENABLED});
 afterAll(()=>{
  if(originalWorkspace===undefined)delete process.env.CONTRACT_WORKSPACE_ENABLED;
  else process.env.CONTRACT_WORKSPACE_ENABLED=originalWorkspace;
  if(originalCancellation===undefined)delete process.env.CONTRACT_CANCELLATIONS_ENABLED;
  else process.env.CONTRACT_CANCELLATIONS_ENABLED=originalCancellation;
 });
 it('fails closed until both server-side flags are enabled',()=>{
  expect(()=>controller.review(req,id)).toThrow(NotFoundException);
  expect(()=>controller.cancel(req,id,{reviewToken:'a'.repeat(64),confirm:true})).toThrow(NotFoundException);
  process.env.CONTRACT_WORKSPACE_ENABLED='true';
  expect(()=>controller.review(req,id)).toThrow(NotFoundException);
  expect(service.cancel).not.toHaveBeenCalled();
 });
 it('uses verified server UID and explicit token+confirmation only',async()=>{
  process.env.CONTRACT_WORKSPACE_ENABLED='true';process.env.CONTRACT_CANCELLATIONS_ENABLED='true';
  service.review.mockResolvedValue({ready:true});service.cancel.mockResolvedValue({cancelled:true});
  await controller.review(req,id);
  await controller.cancel(req,id,{reviewToken:'b'.repeat(64),confirm:true});
  expect(service.review).toHaveBeenCalledWith(req.user.uid,id);
  expect(service.cancel).toHaveBeenCalledWith(req.user.uid,id,'b'.repeat(64),true);
 });
 it('DTO blocks missing consent, random review IDs and extra types',async()=>{
  const dto=Object.assign(new ConfirmContractCancellationDto(),{reviewToken:'nope',confirm:false});
  expect((await validate(dto)).length).toBeGreaterThan(0);
  dto.reviewToken='c'.repeat(64);dto.confirm=true;
  expect(await validate(dto)).toHaveLength(0);
  Object.assign(dto,{confirm:'true'});
  expect((await validate(dto)).length).toBeGreaterThan(0);
 });
});
