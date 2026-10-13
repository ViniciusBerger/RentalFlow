import {validateBrazilianCpf} from './contract-validation';
import type {LandlordProfile} from './contract-questionnaire';

export type LandlordDocumentType='CPF'|'CNPJ';
/** Existing sealed landlord profiles predate documentType; CPF is their legacy type. */
export function landlordDocumentType(profile:LandlordProfile):LandlordDocumentType{
 return profile.documentType==='CNPJ'?'CNPJ':'CPF';
}
export function normalizeCnpj(value:string):string{
 return value.trim().toUpperCase().replaceAll('/','').replace(/[.\s-]/g,'');
}
/** Receita Federal 2026 specification: positions 1–12 may contain A–Z and 0–9,
 * positions 13–14 remain numeric; each letter contributes its ASCII code minus 48. */
export function validateBrazilianCnpj(value:string):boolean{
 const clean=normalizeCnpj(value);
 if(!/^[A-Z0-9]{12}[0-9]{2}$/.test(clean)||/^([A-Z0-9])\1{13}$/.test(clean))
  return false;
 const digit=(input:string,weights:number[])=>{
  const sum=[...input].reduce((n,char,i)=>n+(char.charCodeAt(0)-48)*weights[i],0);
  const remainder=sum%11;
  return remainder<2?0:11-remainder;
 };
 const first=digit(clean.slice(0,12),[5,4,3,2,9,8,7,6,5,4,3,2]);
 const second=digit(clean.slice(0,12)+first,[6,5,4,3,2,9,8,7,6,5,4,3,2]);
 return clean.slice(12)===String(first)+String(second);
}
export function landlordIdentityMissingFields(p:LandlordProfile):string[]{
 const fields:string[]=[];
 if(p.documentType!==undefined&&p.documentType!=='CPF'&&p.documentType!=='CNPJ')fields.push('documentType');
 const type=landlordDocumentType(p);
 const requireField=(key:keyof LandlordProfile,valid?:(value:string)=>boolean)=>{
  const value=p[key]??'';
  if(typeof value!=='string'||!value.trim()||(valid&&!valid(value)))fields.push(key);
 };
 requireField('fullName',value=>value.trim().length>=3);
 if(type==='CPF'){
  requireField('cpf',validateBrazilianCpf);
  requireField('rg',value=>value.trim().length>=4);
 }else{
  requireField('cnpj',validateBrazilianCnpj);
  requireField('representativeName',value=>value.trim().length>=3);
  requireField('representativeCpf',validateBrazilianCpf);
  requireField('representativeRole',value=>value.trim().length>=2);
 }
 for(const key of ['addressStreet','addressNumber','addressDistrict','addressCity'] as const)
  requireField(key);
 requireField('addressState',value=>/^[A-Z]{2}$/.test(value));
 requireField('addressPostalCode',value=>/^\d{5}-?\d{3}$/.test(value));
 if(p.email?.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))fields.push('email');
 if(p.phone?.trim()&&!/^\+?\d[\d\s()-]{8,20}$/.test(p.phone))fields.push('phone');
 return fields;
}
/** Drop fields belonging to another party type from new saved versions.
 * No unapproved document or signing authority is inferred from unused identifiers. */
export function canonicalLandlordProfile(profile:LandlordProfile):LandlordProfile{
 const type=landlordDocumentType(profile);
 const next={...profile,documentType:type};
 if(type==='CNPJ'){
  delete next.cpf;delete next.rg;
  if(next.cnpj)next.cnpj=normalizeCnpj(next.cnpj);
 }else{
  delete next.cnpj;delete next.representativeName;
  delete next.representativeCpf;delete next.representativeRole;
 }
 return next;
}
export function landlordDocument(profile:LandlordProfile):{type:LandlordDocumentType;value:string}{
 const type=landlordDocumentType(profile);
 return {type,value:type==='CNPJ'?normalizeCnpj(profile.cnpj??''):profile.cpf??''};
}
