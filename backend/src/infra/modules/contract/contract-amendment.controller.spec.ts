import {NotFoundException} from '@nestjs/common';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {ContractAmendmentController} from './contract-amendment.controller';
import {ContractAmendmentService} from './contract-amendment.service';
import {ApproveContractAmendmentDto,ContractAmendmentProposalDto} from '../../../web/dto-web/contract/contract-amendment.dto';

describe('account-owned contract amendments',()=>{
 const originalWorkspace=process.env.CONTRACT_WORKSPACE_ENABLED;
 const originalAmend=process.env.CONTRACT_AMENDMENTS_ENABLED;
 const service:any={review:jest.fn(),approve:jest.fn()};
 const controller=new ContractAmendmentController(service as ContractAmendmentService);
 const req={user:{uid:'verified-account'}},id='33333333-3333-4333-8333-333333333333';
 const proposal={propertyId:'22222222-2222-4222-8222-222222222222',
  startDate:'2027-04-01',endDate:'2027-04-03',guests:2,baseRevenueCents:50000,
  guestFee:{mode:'AUTOMATIC'}};
 beforeEach(()=>{jest.clearAllMocks();delete process.env.CONTRACT_WORKSPACE_ENABLED;delete process.env.CONTRACT_AMENDMENTS_ENABLED});
 afterAll(()=>{
  if(originalWorkspace===undefined)delete process.env.CONTRACT_WORKSPACE_ENABLED;
  else process.env.CONTRACT_WORKSPACE_ENABLED=originalWorkspace;
  if(originalAmend===undefined)delete process.env.CONTRACT_AMENDMENTS_ENABLED;
  else process.env.CONTRACT_AMENDMENTS_ENABLED=originalAmend;
 });
 it('never exposes amendment review or mutation when either feature gate is disabled',()=>{
  expect(()=>controller.review(req,id,proposal as ContractAmendmentProposalDto)).toThrow(NotFoundException);
  process.env.CONTRACT_WORKSPACE_ENABLED='true';
  expect(()=>controller.approve(req,id,{proposal,reviewToken:'a'.repeat(64),confirm:true} as ApproveContractAmendmentDto))
   .toThrow(NotFoundException);
  expect(service.review).not.toHaveBeenCalled();
 });
 it('uses verified session owner only and passes explicit review into service',async()=>{
  process.env.CONTRACT_WORKSPACE_ENABLED='true';process.env.CONTRACT_AMENDMENTS_ENABLED='true';
  service.review.mockResolvedValue({ready:true});service.approve.mockResolvedValue({applied:true});
  await controller.review(req,id,proposal as ContractAmendmentProposalDto);
  await controller.approve(req,id,{proposal,reviewToken:'a'.repeat(64),confirm:true} as ApproveContractAmendmentDto);
  expect(service.review).toHaveBeenCalledWith('verified-account',id,proposal);
  expect(service.approve).toHaveBeenCalledWith('verified-account',id,proposal,'a'.repeat(64),true);
 });
 it('DTO rejects forged totals, missing approval, invalid dates and excessive occupancy',async()=>{
  const dto=plainToInstance(ApproveContractAmendmentDto,{
   proposal:{...proposal,guests:1000,extraRevenueCents:100000},
   reviewToken:'invalid',confirm:false});
  expect((await validate(dto)).length).toBeGreaterThan(0);
  const correct=plainToInstance(ApproveContractAmendmentDto,{
   proposal,reviewToken:'a'.repeat(64),confirm:true});
  expect(await validate(correct)).toEqual([]);
  const invalid=plainToInstance(ContractAmendmentProposalDto,{
   ...proposal,startDate:'2027-02-99',guests:-2});
  expect((await validate(invalid)).length).toBeGreaterThan(0);
 });
});
