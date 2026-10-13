import {csrfFetch} from '../../lib/csrf-fetch';
const base=import.meta.env.VITE_API_URL || 'http://localhost:3000';
export type Landlord={fullName:string;cpf:string;rg:string;addressStreet:string;addressNumber:string;addressDistrict:string;addressCity:string;addressState:string;addressPostalCode:string;addressComplement:string;phone:string;email:string;pixKey:string;bankName:string;bankAgency:string;bankAccount:string};
export type Policy={jurisdiction:string;cancellationDays:number;damagePenaltyPercent:number;breachPenaltyPercent:number;utilitiesIncluded:boolean};
export type Payment={installmentCount:number;acceptedMethods:string[];defaultDueRule:string;depositMode:string};
export type Clause={id:string;title:string;body:string;enabled:boolean};
export type PropertySetup={includedOccupancy:number;maximumOccupancy:number;extraGuestRateCents:number;checkInTime:string;checkOutTime:string;providesLinen:boolean;hasPool:boolean;houseRules:string[]};
export const initialLandlord:Landlord={fullName:'',cpf:'',rg:'',addressStreet:'',addressNumber:'',addressDistrict:'',addressCity:'',addressState:'',addressPostalCode:'',addressComplement:'',phone:'',email:'',pixKey:'',bankName:'',bankAgency:'',bankAccount:''};
export const initialPolicy:Policy={jurisdiction:'',cancellationDays:30,damagePenaltyPercent:50,breachPenaltyPercent:10,utilitiesIncluded:true};
export const initialPayment:Payment={installmentCount:2,acceptedMethods:['PIX','BANK_TRANSFER'],defaultDueRule:'KEY_HANDOVER',depositMode:'MANUAL'};
export const initialProperty:PropertySetup={includedOccupancy:1,maximumOccupancy:1,extraGuestRateCents:0,checkInTime:'14:00',checkOutTime:'17:00',providesLinen:false,hasPool:false,houseRules:[]};
export const contractFeatureEnabled=import.meta.env.VITE_CONTRACT_QUESTIONNAIRE_ENABLED==='true';
async function send<T>(path:string,init?:RequestInit):Promise<T>{
 const url=`${base}/contracts${path}`;
 const headers={'Content-Type':'application/json',...init?.headers};
 const response=await (init?.method?csrfFetch:fetch)(url,{...init,credentials:'include',cache:'no-store',headers});
 if(!response.ok){
  const error:unknown=await response.json().catch(()=>null);
  const message=error&&typeof error==='object'&&'message' in error?
   (Array.isArray(error.message)?error.message.join('; '):String(error.message)):`HTTP ${response.status}`;
  throw new Error(message);
 }
 return response.json() as Promise<T>;
}
export type SettingsResponse={landlord:Partial<Landlord>;policy:Policy;payment:Payment;configured:boolean};
export type TemplateResponse={draft:{id:string;versionNumber:number;clauses:Clause[]}|null;
 published:{id:string;versionNumber:number;publishedAt:string;clauses:Clause[]}|null;scaffold:Clause[]};
export const readSettings=()=>send<SettingsResponse>('/settings');
export const saveSettings=(landlord:Landlord,policy:Policy,payment:Payment)=>send<{saved:boolean}>('/settings',{
 method:'PUT',body:JSON.stringify({landlord,policy,payment})});
export const readTemplate=()=>send<TemplateResponse>('/template');
export const saveTemplateDraft=(clauses:Clause[])=>send<{id:string;versionNumber:number}>('/template/draft',{
 method:'PUT',body:JSON.stringify({clauses})});
export const publishTemplate=(draftId:string)=>send<{id:string;versionNumber:number}>('/template/publish',{
 method:'POST',body:JSON.stringify({draftId})});
export const readPropertySetup=(propertyId:string)=>send<{property:{id:string;name:string;address:string|null};settings:PropertySetup|null}>(`/properties/${propertyId}/settings`);
export const savePropertySetup=(propertyId:string,settings:PropertySetup)=>send<{saved:boolean}>(`/properties/${propertyId}/settings`,{
 method:'PUT',body:JSON.stringify(settings)});

export type ContractReadinessIssue={
 code:'ACCOUNT_SETTINGS'|'LANDLORD_DETAILS'|'PAYMENT_METHODS'|'PAYMENT_DETAILS'|'JURISDICTION'|
  'TEMPLATE_NOT_PUBLISHED'|'TEMPLATE_INVALID'|'NO_ACTIVE_PROPERTIES'|
  'PROPERTY_ADDRESS'|'PROPERTY_SETTINGS'|'DRAFT_CONTRACTS';
 fields?:string[];propertyId?:string;propertyName?:string;count?:number
};
export const readContractReadiness=()=>send<{ready:boolean;issues:ContractReadinessIssue[]}>('/readiness');
