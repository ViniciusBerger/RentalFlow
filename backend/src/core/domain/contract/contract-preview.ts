import {validateClauses,type ContractClause,type LandlordProfile} from './contract-questionnaire';

export type PreviewInstallment={
 sequence:number;agreedCents:number;dueDate?:string|null;dueEvent?:string|null;
 paymentMethod?:string|null;isDeposit:boolean;
};
export type PreviewInput={
 template:ContractClause[]|null;
 landlord:LandlordProfile|null;
 guest:Record<string,string>;
 rental:{clientFirstName:string;clientLastName:string;startDate:string;endDate:string;guests:number;revenue:number};
 property:{address:string|null};
 propertyRules:{checkInTime:string|null;checkOutTime:string|null;includedOccupancy:number|null;
  maximumOccupancy:number|null;extraGuestRateCents:number|null};
 policy:{cancellationDays?:number;damagePenaltyPercent?:number;breachPenaltyPercent?:number;jurisdiction?:string};
 installments:PreviewInstallment[];
};
export type RenderedPreview={watermark:'RASCUNHO - NAO FINALIZADO'|'FINALIZADO - NAO ASSINADO';ready:boolean;missing:string[];
 clauses:{id:string;title:string;body:string}[]};
const brl=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export function renderContractPreview(input:PreviewInput):RenderedPreview{
 const missing=new Set<string>();
 const required=(key:string,v:string|number|null|undefined)=>{
  const value=v===null||v===undefined?'':String(v).trim();
  if(!value)missing.add(key);
  return value||'[PENDENTE: '+key+']';
 };
 const owner=input.landlord??{},guest=input.guest,r=input.rental,p=input.propertyRules;
 const fullName=[r.clientFirstName,r.clientLastName].filter(Boolean).join(' ');
 const address=[owner.addressStreet,owner.addressNumber,owner.addressComplement,owner.addressDistrict,
   owner.addressCity,owner.addressState,owner.addressPostalCode].filter(Boolean).join(', ');
 const payments=input.installments.map(x=>x.sequence+'. '+brl(x.agreedCents)+
   (x.dueDate?' - '+x.dueDate:x.dueEvent?' - '+x.dueEvent:' - vencimento pendente')).join('; ');
 const values:Record<string,string>={
  'locador.nome':required('locador.nome',owner.fullName),'locador.cpf':required('locador.cpf',owner.cpf),
  'locador.rg':required('locador.rg',owner.rg),'locador.endereco':required('locador.endereco',address),
  'locatario.nome':required('locatario.nome',fullName),
  'locatario.cpf':required('locatario.cpf',guest.cpf),'locatario.rg':required('locatario.rg',guest.rg),
  'locatario.endereco':required('locatario.endereco',guest.address),
  'locatario.telefone':required('locatario.telefone',guest.phone),
  'locatario.email':required('locatario.email',guest.email),
  'imovel.endereco':required('imovel.endereco',input.property.address),
  'imovel.entrada':required('imovel.entrada',p.checkInTime),
  'imovel.saida':required('imovel.saida',p.checkOutTime),
  'imovel.incluidos':required('imovel.incluidos',p.includedOccupancy),
  'imovel.maximo':required('imovel.maximo',p.maximumOccupancy),
  'imovel.taxa_extra':p.extraGuestRateCents===null?'[PENDENTE: imovel.taxa_extra]':brl(p.extraGuestRateCents??0),
  'reserva.entrada':required('reserva.entrada',r.startDate),
  'reserva.saida':required('reserva.saida',r.endDate),
  'reserva.hospedes':required('reserva.hospedes',r.guests),
  'reserva.valor_total':brl(Math.round(r.revenue*100)),
  'reserva.parcelas':required('reserva.parcelas',payments),
  'reserva.sinal':input.installments.find(x=>x.isDeposit)
    ?brl(input.installments.find(x=>x.isDeposit)!.agreedCents):'Sem sinal identificado',
  'politica.cancelamento_dias':required('politica.cancelamento_dias',input.policy.cancellationDays),
  'politica.multa_danos':required('politica.multa_danos',input.policy.damagePenaltyPercent),
  'politica.multa_descumprimento':required('politica.multa_descumprimento',input.policy.breachPenaltyPercent),
  'foro.cidade_estado':required('foro.cidade_estado',input.policy.jurisdiction)
 };
 if(p.extraGuestRateCents===null)missing.add('imovel.taxa_extra');
 if(!input.template)return {watermark:'RASCUNHO - NAO FINALIZADO',ready:false,
  missing:['modelo.publicado'],clauses:[]};
 const clauses=validateClauses(input.template,true).filter(x=>x.enabled).map(x=>({
  id:x.id,title:x.title,
  body:x.body.replace(/{{([^{}]+)}}/g,(_whole,key:string)=>values[key]??'[PENDENTE: '+key+']')
 }));
 const used=new Set<string>();
 for(const clause of input.template)for(const m of clause.body.matchAll(/{{([^{}]+)}}/g))used.add(m[1]);
 for(const key of [...missing])if(!used.has(key))missing.delete(key);
 return {watermark:'RASCUNHO - NAO FINALIZADO',ready:missing.size===0,
  missing:[...missing],clauses};
}
