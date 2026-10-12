import {NotFoundException} from '@nestjs/common';
import {ContractFinalizationController} from './contract-finalization.controller';
import {ContractFinalizationService} from './contract-finalization.service';

describe('finalization permission and feature flags',()=>{
 const id='33333333-3333-4333-8333-333333333333';
 const request={user:{uid:'session-owner'}};
 const service={review:jest.fn(),finalize:jest.fn()};
 const controller=new ContractFinalizationController(service as unknown as ContractFinalizationService);
 const oldWorkspace=process.env.CONTRACT_WORKSPACE_ENABLED;
 const oldFinal=process.env.CONTRACT_FINALIZATION_ENABLED;
 beforeEach(()=>{jest.clearAllMocks();delete process.env.CONTRACT_WORKSPACE_ENABLED;
  delete process.env.CONTRACT_FINALIZATION_ENABLED;});
 afterAll(()=>{if(oldWorkspace===undefined)delete process.env.CONTRACT_WORKSPACE_ENABLED;
  else process.env.CONTRACT_WORKSPACE_ENABLED=oldWorkspace;
  if(oldFinal===undefined)delete process.env.CONTRACT_FINALIZATION_ENABLED;
  else process.env.CONTRACT_FINALIZATION_ENABLED=oldFinal;});
 it('never exposes finalization when either flag is missing',()=>{
  expect(()=>controller.review(request,id)).toThrow(NotFoundException);
  expect(()=>controller.finalize(request,id,{reviewToken:'a'.repeat(64),confirm:true})).toThrow(NotFoundException);
  process.env.CONTRACT_WORKSPACE_ENABLED='true';
  expect(()=>controller.review(request,id)).toThrow(NotFoundException);
  expect(service.review).not.toHaveBeenCalled();
  expect(service.finalize).not.toHaveBeenCalled();
 });
 it('takes ownership only from authenticated request and forwards explicit confirmation',()=>{
  process.env.CONTRACT_WORKSPACE_ENABLED='true';
  process.env.CONTRACT_FINALIZATION_ENABLED='true';
  controller.review(request,id);
  expect(service.review).toHaveBeenCalledWith('session-owner',id);
  controller.finalize(request,id,{reviewToken:'b'.repeat(64),confirm:true});
  expect(service.finalize).toHaveBeenCalledWith('session-owner',id,'b'.repeat(64),true);
 });
});
