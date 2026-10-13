import {validateBrazilianCpf} from './contract-validation';
import {validateClauses,type ContractClause,type ContractPayment,type ContractPolicy,type LandlordProfile} from './contract-questionnaire';

export type ReadinessIssueCode =
 'ACCOUNT_SETTINGS'|'LANDLORD_DETAILS'|'PAYMENT_METHODS'|'PAYMENT_DETAILS'|'JURISDICTION'|
 'TEMPLATE_NOT_PUBLISHED'|'TEMPLATE_INVALID'|'NO_ACTIVE_PROPERTIES'|
 'PROPERTY_ADDRESS'|'PROPERTY_SETTINGS'|'DRAFT_CONTRACTS';
export type ReadinessIssue = {code:ReadinessIssueCode; fields?:string[]; propertyId?:string; propertyName?:string; count?:number};
export type ReadinessProperty={id:string;name:string;address:string|null;settings:{
 includedOccupancy:number|null;maximumOccupancy:number|null;extraGuestRateCents:number|null;
 checkInTime:string|null;checkOutTime:string|null
}|null};
export function readinessIssues(input:{
 configured:boolean;landlord:LandlordProfile;policy:ContractPolicy;payment:ContractPayment;
 publishedClauses:ContractClause[]|null;properties:ReadinessProperty[];draftCount:number
}):ReadinessIssue[]{
 const issues:ReadinessIssue[]=[];
 if(!input.configured)issues.push({code:'ACCOUNT_SETTINGS'});
 const p=input.landlord;
 const missing:string[]=[];
 const required:{key:keyof LandlordProfile;valid?:(v:string)=>boolean}[]=[
  {key:'fullName',valid:v=>v.trim().length>=3},
  {key:'cpf',valid:validateBrazilianCpf},{key:'rg',valid:v=>v.trim().length>=4},
  {key:'addressStreet'},{key:'addressNumber'},{key:'addressDistrict'},{key:'addressCity'},
  {key:'addressState',valid:v=>/^[A-Z]{2}$/.test(v)},
  {key:'addressPostalCode',valid:v=>/^\d{5}-?\d{3}$/.test(v)}
 ];
 for(const r of required){
  const value=p[r.key]??'';
  if(!value.trim()||(r.valid&&!r.valid(value)))missing.push(r.key);
 }
 if(p.email?.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))missing.push('email');
 if(p.phone?.trim()&&!/^\+?\d[\d\s()-]{8,20}$/.test(p.phone))missing.push('phone');
 if(missing.length)issues.push({code:'LANDLORD_DETAILS',fields:missing});
 if(!/^.{2,90}\/[A-Z]{2}$/.test(input.policy.jurisdiction?.trim()??''))issues.push({code:'JURISDICTION',fields:['jurisdiction']});
 const methods=input.payment.acceptedMethods;
 if(!Array.isArray(methods)||!methods.length||methods.some(m=>!['PIX','BANK_TRANSFER','CUSTOM'].includes(m))||
  new Set(methods).size!==methods.length)issues.push({code:'PAYMENT_METHODS',fields:['acceptedMethods']});
 const bankMissing:string[]=[];
 if(methods?.includes('PIX')&&!p.pixKey?.trim())bankMissing.push('pixKey');
 if(methods?.includes('BANK_TRANSFER')){
  for(const key of ['bankName','bankAgency','bankAccount'] as const)if(!p[key]?.trim())bankMissing.push(key);
 }
 if(bankMissing.length)issues.push({code:'PAYMENT_DETAILS',fields:bankMissing});
 if(!input.publishedClauses)issues.push({code:'TEMPLATE_NOT_PUBLISHED'});
 else{
  try{validateClauses(input.publishedClauses,true);}
  catch{issues.push({code:'TEMPLATE_INVALID'});}
 }
 if(input.properties.length===0)issues.push({code:'NO_ACTIVE_PROPERTIES'});
 for(const property of input.properties){
  if(!property.address?.trim())issues.push({code:'PROPERTY_ADDRESS',propertyId:property.id,propertyName:property.name,fields:['address']});
  const s=property.settings;
  const f:string[]=[];
  if(!s||!Number.isSafeInteger(s.includedOccupancy)||s.includedOccupancy!<=0)f.push('includedOccupancy');
  if(!s||!Number.isSafeInteger(s.maximumOccupancy)||s.maximumOccupancy!<(s.includedOccupancy??0)||s.maximumOccupancy!<=0)f.push('maximumOccupancy');
  if(!s||!Number.isSafeInteger(s.extraGuestRateCents)||s.extraGuestRateCents!<0)f.push('extraGuestRateCents');
  if(!s||!s.checkInTime||!/^\d\d:\d\d/.test(s.checkInTime))f.push('checkInTime');
  if(!s||!s.checkOutTime||!/^\d\d:\d\d/.test(s.checkOutTime))f.push('checkOutTime');
  if(f.length)issues.push({code:'PROPERTY_SETTINGS',propertyId:property.id,propertyName:property.name,fields:f});
 }
 if(input.draftCount>0)issues.push({code:'DRAFT_CONTRACTS',count:input.draftCount});
 return issues;
}
