import { BadRequestException } from '@nestjs/common';
import { safeClauseText } from '../../../infra/security/secure-clause-text';
import { validateBrazilianCpf } from './contract-validation';

export type ContractClause = { id:string; title:string; body:string; enabled:boolean };
export type ContractPolicy = { jurisdiction:string; cancellationDays:number; damagePenaltyPercent:number; breachPenaltyPercent:number; utilitiesIncluded:boolean };
export type ContractPayment = { installmentCount:number; acceptedMethods:string[]; defaultDueRule:string; depositMode:string };
export type LandlordProfile = { fullName?:string; cpf?:string; rg?:string; addressStreet?:string;addressNumber?:string;addressDistrict?:string;addressCity?:string;addressState?:string;addressPostalCode?:string;addressComplement?:string;phone?:string;email?:string;
  pixKey?:string; bankName?:string; bankAgency?:string; bankAccount?:string };
export const defaultPolicy:ContractPolicy = {jurisdiction:'',cancellationDays:30,damagePenaltyPercent:50,breachPenaltyPercent:10,utilitiesIncluded:true};
export const defaultPayment:ContractPayment = {installmentCount:2,acceptedMethods:['PIX','BANK_TRANSFER'],defaultDueRule:'KEY_HANDOVER',depositMode:'MANUAL'};
/** These are editorial section labels only; never silently replace the customer's original contract wording. */
const headings=[
 'Imóvel e vistoria', 'Entrada e saída', 'Finalidade da locação', 'Preço e pagamento',
 'Cancelamento e remarcação', 'Despesas e comprovantes', 'Conservação do imóvel',
 'Sublocação', 'Acesso e vistoria', 'Danos ao imóvel', 'Descumprimento contratual',
 'Alterações por escrito', 'Ocupação e hóspedes', 'Regras de convivência',
 'Rescisão', 'Foro'
];
export const emptyContractClauses=():ContractClause[]=>[
 ...headings.map((title,index)=>({id:String(index+1),title,body:'',enabled:true})),
 {id:'annex',title:'Anexo I — Regras da casa',body:'',enabled:true}
];
const placeholders=new Set([
 'locador.nome','locador.cpf','locador.rg','locador.endereco',
 'locatario.nome','locatario.cpf','locatario.rg','locatario.endereco','locatario.telefone','locatario.email',
 'imovel.endereco','imovel.entrada','imovel.saida','imovel.incluidos','imovel.maximo','imovel.taxa_extra',
 'reserva.entrada','reserva.saida','reserva.hospedes','reserva.valor_total','reserva.parcelas','reserva.sinal',
 'politica.cancelamento_dias','politica.multa_danos','politica.multa_descumprimento','foro.cidade_estado'
]);
/** Identity details belong in AES-sealed profile/guest records, not plaintext templates. */
export function rejectEmbeddedIdentifiers(text:string):void {
 const emails=/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
 if(emails.test(text))throw new BadRequestException('Use placeholders instead of embedding email addresses');
 const cpfCandidates=text.match(/(?<![0-9])(?:[0-9]{3}[.\s-]?){3}[0-9]{2}(?![0-9])/g)??[];
 if(cpfCandidates.some(candidate=>validateBrazilianCpf(candidate)))throw new BadRequestException('Use placeholders instead of embedding CPF numbers');
}
export function validateClauses(input:ContractClause[],publish=false):ContractClause[] {
 if(!Array.isArray(input)||input.length>40||input.length<17)throw new BadRequestException('Invalid clause list');
 const seen=new Set<string>();
 const normalized=input.map(c=>{
  if(!c||typeof c!=='object'||typeof c.id!=='string'||typeof c.title!=='string'||
    typeof c.body!=='string'||typeof c.enabled!=='boolean'||c.id.length>64||
    !/^(?:[1-9]|1[0-6]|annex|extra-[a-zA-Z0-9-]{1,48})$/.test(c.id) ||
    seen.has(c.id)||c.title.trim().length<2||c.title.length>120||c.body.length>10000) {
   throw new BadRequestException('Invalid clause format');
  }
  seen.add(c.id);
  if([...c.title].some(ch=>{const n=ch.charCodeAt(0);return n<32&&n!==9&&n!==10&&n!==13;})||c.title.includes('{{'))throw new BadRequestException('Invalid clause heading');
  const body=c.body.trim()?safeClauseText(c.body):'';
  rejectEmbeddedIdentifiers(body);
  const matches=[...body.matchAll(/{{([^{}]+)}}/g)];
  for(const match of matches)if(!placeholders.has(match[1]))throw new BadRequestException('Unapproved contract placeholder');
  if((body.match(/{{/g)||[]).length!==matches.length||(body.match(/}}/g)||[]).length!==matches.length)throw new BadRequestException('Invalid contract placeholder syntax');
  return {id:c.id,title:c.title.trim(),body,enabled:c.enabled};
 });
 for(let n=1;n<=16;n++)if(!seen.has(String(n)))throw new BadRequestException('All 16 clauses are required');
 if(!seen.has('annex'))throw new BadRequestException('House rules annex is required');
 if(publish){
   for(const c of normalized)if((c.id==='annex'||/^\d+$/.test(c.id))&&(!c.enabled||c.body.length<10)){
     throw new BadRequestException('Complete all 16 original clauses and the annex before publishing');
   }
   if(normalized.some(c=>c.enabled&&c.body.length<10))throw new BadRequestException('Enabled additional clauses cannot be blank');
 }
 return normalized;
}
export function validateLandlordForPublish(profile:LandlordProfile|null|undefined,policy:ContractPolicy,payment:ContractPayment):void {
 if(!profile||!profile.fullName?.trim()||profile.fullName.trim().length<3||!validateBrazilianCpf(profile.cpf??'')||
   !profile.rg?.trim()||profile.rg.length<4||
   !profile.addressStreet?.trim()||!profile.addressNumber?.trim()||!profile.addressDistrict?.trim()||
   !profile.addressCity?.trim()||!profile.addressState||!/^[A-Z]{2}$/.test(profile.addressState)||
   !profile.addressPostalCode||!/^\\d{5}-?\\d{3}$/.test(profile.addressPostalCode)) {
   throw new BadRequestException('Complete landlord identification before publishing');
 }
 if(profile.email?.trim()&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(profile.email))throw new BadRequestException('Invalid landlord email');
 if(profile.phone?.trim()&&!/^\\+?\\d[\\d\\s()-]{8,20}$/.test(profile.phone))throw new BadRequestException('Invalid landlord phone');
 if(!/^.{2,90}\/[A-Z]{2}$/.test(policy.jurisdiction.trim()))throw new BadRequestException('Jurisdiction city/state is required');
 if(payment.acceptedMethods.length===0)throw new BadRequestException('Select an accepted payment method');
 if(payment.acceptedMethods.includes('PIX')&&!profile.pixKey?.trim())throw new BadRequestException('PIX key is required for PIX payments');
 if(payment.acceptedMethods.includes('BANK_TRANSFER')&&
    (!profile.bankName?.trim()||!profile.bankAgency?.trim()||!profile.bankAccount?.trim())) {
   throw new BadRequestException('Bank details are required for bank transfers');
 }
}
