import {NotFoundException} from '@nestjs/common';
import {ContractQuestionnaireController} from './contract-questionnaire.controller';
import {ContractQuestionnaireService} from './contract-questionnaire.service';
describe('contract questionnaire authorization and server-only activation',()=>{
 const prev=process.env.CONTRACT_QUESTIONNAIRE_ENABLED;
 const uid='verified-firebase-user';
 const req={user:{uid}};
 const service:any={
  settings:jest.fn(),saveSettings:jest.fn(),template:jest.fn(),saveDraft:jest.fn(),publish:jest.fn(),
  propertySettings:jest.fn(),savePropertySettings:jest.fn()
 };
 const controller=new ContractQuestionnaireController(service as ContractQuestionnaireService);
 beforeEach(()=>{jest.clearAllMocks();delete process.env.CONTRACT_QUESTIONNAIRE_ENABLED});
 afterAll(()=>{if(prev===undefined)delete process.env.CONTRACT_QUESTIONNAIRE_ENABLED;else process.env.CONTRACT_QUESTIONNAIRE_ENABLED=prev});
 it('fails closed when the release feature gate is not active',()=>{
  expect(()=>controller.getSettings(req)).toThrow(NotFoundException);
  expect(()=>controller.saveSettings(req,{} as any)).toThrow(NotFoundException);
  expect(()=>controller.saveDraft(req,{} as any)).toThrow(NotFoundException);
  expect(()=>controller.publish(req,{draftId:'some-client-input'})).toThrow(NotFoundException);
  expect(service.settings).not.toHaveBeenCalled();
 });
 it('always derives landlord settings identity from authenticated server session',async()=>{
  process.env.CONTRACT_QUESTIONNAIRE_ENABLED='true';
  const dto:any={landlord:{fullName:'Ana'},policy:{jurisdiction:'Vitória/ES'},payment:{installmentCount:2}};
  service.saveSettings.mockResolvedValue({saved:true});
  await controller.saveSettings(req,dto);
  expect(service.saveSettings).toHaveBeenCalledWith(uid,dto.landlord,dto.policy,dto.payment);
 });
 it('scopes every template operation to the authenticated user',async()=>{
  process.env.CONTRACT_QUESTIONNAIRE_ENABLED='true';
  await controller.getTemplate(req);expect(service.template).toHaveBeenCalledWith(uid);
  const clauses:any=[];await controller.saveDraft(req,{clauses});
  expect(service.saveDraft).toHaveBeenCalledWith(uid,clauses);
  const draftId='550e8400-e29b-41d4-a716-446655440000';
  await controller.publish(req,{draftId});expect(service.publish).toHaveBeenCalledWith(uid,draftId);
 });
 it('scopes property reads and writes to the authenticated user',async()=>{
  process.env.CONTRACT_QUESTIONNAIRE_ENABLED='true';
  const propertyId='550e8400-e29b-41d4-a716-446655440001';
  await controller.getPropertySettings(req,propertyId);expect(service.propertySettings).toHaveBeenCalledWith(uid,propertyId);
  const dto:any={includedOccupancy:10,maximumOccupancy:12,extraGuestRateCents:25000};
  await controller.savePropertySettings(req,propertyId,dto);
  expect(service.savePropertySettings).toHaveBeenCalledWith(uid,propertyId,dto);
 });
});
