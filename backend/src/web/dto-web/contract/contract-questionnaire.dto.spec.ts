import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {SaveQuestionnaireDto,SaveTemplateDraftDto,PropertyContractSettingsDto} from './contract-questionnaire.dto';
const settings={landlord:{fullName:'Ana',cpf:'52998224725',rg:'12345678',address:'Rua Flores 10'},
 policy:{jurisdiction:'Vitória/ES',cancellationDays:30,damagePenaltyPercent:50,breachPenaltyPercent:10,utilitiesIncluded:true},
 payment:{installmentCount:2,acceptedMethods:['PIX'],defaultDueRule:'KEY_HANDOVER',depositMode:'MANUAL'}};
const check=async<T extends object>(Class:new()=>T,data:unknown)=>validate(plainToInstance(Class,data),{
 whitelist:true,forbidNonWhitelisted:true
});
describe('contract questionnaire DTO whitelist',()=>{
 it('accepts the approved policy and payment shape',async()=>{
  expect(await check(SaveQuestionnaireDto,settings)).toHaveLength(0);
 });
 it('rejects frontend claims of ownership, approval and hidden payment state',async()=>{
  expect(await check(SaveQuestionnaireDto,{...settings,userId:'other-tenant'})).not.toHaveLength(0);
  expect(await check(SaveQuestionnaireDto,{...settings,policy:{...settings.policy,contractApproved:true}})).not.toHaveLength(0);
  expect(await check(SaveQuestionnaireDto,{...settings,payment:{...settings.payment,feeReceived:1000}})).not.toHaveLength(0);
 });
 it('rejects negative and overflow penalties, invalid installment count and method',async()=>{
  expect(await check(SaveQuestionnaireDto,{...settings,policy:{...settings.policy,damagePenaltyPercent:-50}})).not.toHaveLength(0);
  expect(await check(SaveQuestionnaireDto,{...settings,payment:{...settings.payment,installmentCount:13}})).not.toHaveLength(0);
  expect(await check(SaveQuestionnaireDto,{...settings,payment:{...settings.payment,acceptedMethods:['FAKE']}})).not.toHaveLength(0);
 });
 it('rejects nested unknown clause fields and invalid shapes',async()=>{
  const clauses=Array.from({length:17},(_,i)=>({id:i===16?'annex':String(i+1),title:'Section',body:'',enabled:true}));
  expect(await check(SaveTemplateDraftDto,{clauses})).toHaveLength(0);
  expect(await check(SaveTemplateDraftDto,{clauses:[{...clauses[0],approved:true},...clauses.slice(1)]})).not.toHaveLength(0);
 });
 it('validates property limit, time and rules arrays on the server',async()=>{
  const property={includedOccupancy:10,maximumOccupancy:12,extraGuestRateCents:25000,
    checkInTime:'14:00',checkOutTime:'17:00',providesLinen:false,hasPool:true,houseRules:['No noise']};
  expect(await check(PropertyContractSettingsDto,property)).toHaveLength(0);
  expect(await check(PropertyContractSettingsDto,{...property,maximumOccupancy:'twelve'})).not.toHaveLength(0);
  expect(await check(PropertyContractSettingsDto,{...property,extraGuestRateCents:-1})).not.toHaveLength(0);
  expect(await check(PropertyContractSettingsDto,{...property,checkInTime:'99:99'})).not.toHaveLength(0);
  expect(await check(PropertyContractSettingsDto,{...property,houseRules:[{html:'<script>'}]})).not.toHaveLength(0);
 });
});
