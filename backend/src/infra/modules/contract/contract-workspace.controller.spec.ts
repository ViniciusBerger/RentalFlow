import {NotFoundException} from '@nestjs/common';
import {ContractWorkspaceController} from './contract-workspace.controller';
import {ContractWorkspaceService} from './contract-workspace.service';

describe('contract workspace session and deployment boundaries',()=>{
 const key='33333333-3333-4333-8333-333333333333';
 const uid='verified-account-A',req={user:{uid}};
 const service={list:jest.fn(),detail:jest.fn(),save:jest.fn()};
 const controller=new ContractWorkspaceController(service as unknown as ContractWorkspaceService);
 const previous=process.env.CONTRACT_WORKSPACE_ENABLED;
 beforeEach(()=>{jest.clearAllMocks();delete process.env.CONTRACT_WORKSPACE_ENABLED;});
 afterAll(()=>{if(previous===undefined)delete process.env.CONTRACT_WORKSPACE_ENABLED;
  else process.env.CONTRACT_WORKSPACE_ENABLED=previous;});
 it('is unavailable by default on every route, including PDF',async()=>{
  expect(()=>controller.list(req)).toThrow(NotFoundException);
  expect(()=>controller.detail(req,key)).toThrow(NotFoundException);
  expect(()=>controller.edit(req,key,{} as any)).toThrow(NotFoundException);
  await expect(controller.pdf(req,key,undefined,{} as any)).rejects.toThrow(NotFoundException);
  expect(service.list).not.toHaveBeenCalled();
  expect(service.save).not.toHaveBeenCalled();
  expect(service.detail).not.toHaveBeenCalled();
 });
 it('uses only the verified UID for list, detail and mutation',async()=>{
  process.env.CONTRACT_WORKSPACE_ENABLED='true';
  await controller.list(req,'DRAFT','property-1','Ana');
  expect(service.list).toHaveBeenCalledWith(uid,{status:'DRAFT',propertyId:'property-1',query:'Ana'});
  await controller.detail(req,key);expect(service.detail).toHaveBeenCalledWith(uid,key);
  const dto={editToken:'a'.repeat(64),guest:{cpf:'test'}};
  await controller.edit(req,key,dto as any);
  expect(service.save).toHaveBeenCalledWith(uid,key,dto);
 });
 it('never creates official PDFs; preview is private and watermarked',async()=>{
  process.env.CONTRACT_WORKSPACE_ENABLED='true';
  service.detail.mockResolvedValueOnce({preview:{watermark:'RASCUNHO - NAO FINALIZADO',
   missing:['locatario.cpf'],ready:false,
   clauses:[{id:'1',title:'Documento',body:'Texto sem validade jurídica.'}]}});
  const headers=new Map<string,string>();
  const res:any={setHeader:jest.fn((key:string,value:string)=>headers.set(key,value)),
   send:jest.fn()};
  await controller.pdf(req,key,'1',res);
  expect(service.detail).toHaveBeenCalledWith(uid,key);
  expect(headers.get('Content-Type')).toBe('application/pdf');
  expect(headers.get('Cache-Control')).toContain('no-store');
  expect(headers.get('Content-Disposition')).toContain('attachment');
  expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
  expect((res.send.mock.calls[0][0] as Buffer).subarray(0,5).toString()).toBe('%PDF-');
 });
});
