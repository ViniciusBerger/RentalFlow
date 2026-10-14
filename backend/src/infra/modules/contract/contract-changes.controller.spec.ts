import {NotFoundException} from '@nestjs/common';
import {ContractChangesController} from './contract-changes.controller';
import {ContractChangesService} from './contract-changes.service';

describe('contract cancellation preview release gate',()=>{
 const previous=process.env.CONTRACT_CHANGES_ENABLED;
 const workspace=process.env.CONTRACT_WORKSPACE_ENABLED;
 const status=jest.fn();
 const controller=new ContractChangesController({cancellationPreview:status} as unknown as ContractChangesService);
 const uid='verified-owner';
 const id='33333333-3333-4333-8333-333333333333';
 afterAll(()=>{
  if(previous===undefined)delete process.env.CONTRACT_CHANGES_ENABLED;
  else process.env.CONTRACT_CHANGES_ENABLED=previous;
  if(workspace===undefined)delete process.env.CONTRACT_WORKSPACE_ENABLED;
  else process.env.CONTRACT_WORKSPACE_ENABLED=workspace;
 });
 it('is entirely off by default',()=>{
  delete process.env.CONTRACT_CHANGES_ENABLED;
  expect(()=>controller.preview({user:{uid}},id)).toThrow(NotFoundException);
  expect(status).not.toHaveBeenCalled();
 });
 it('uses session identity and only the resource id to retrieve server pricing',async()=>{
  process.env.CONTRACT_WORKSPACE_ENABLED='true';
  process.env.CONTRACT_CHANGES_ENABLED='true';
  status.mockResolvedValueOnce({cancellationStatus:'PREVIEW_ONLY'});
  expect(await controller.preview({user:{uid}},id)).toEqual({cancellationStatus:'PREVIEW_ONLY'});
  expect(status).toHaveBeenCalledWith(uid,id);
 });
});
