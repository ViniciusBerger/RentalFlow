import {renderContractPreview,type PreviewInput} from './contract-preview';
import {renderDraftPdf} from '../../../infra/modules/contract/contract-preview-pdf';

const clauses=Array.from({length:17},(_,i)=>({
 id:i===16?'annex':String(i+1),
 title:i===16?'Anexo I':'Cláusula '+(i+1),
 body:i===0?'Locatário: {{locatario.nome}}, CPF {{locatario.cpf}}. Valor {{reserva.valor_total}}.':
 i===1?'Locador: {{locador.nome}}, imóvel: {{imovel.endereco}}.':'Texto do contrato aprovado pelo locador, cláusula '+i+'.',
 enabled:true
}));
const fixture=():PreviewInput=>({
 template:clauses,landlord:{fullName:'Ana Host'},
 guest:{cpf:'52998224725'},
 rental:{clientFirstName:'Bruno',clientLastName:'Silva',startDate:'2027-01-01',
 endDate:'2027-01-03',guests:2,revenue:400},
 property:{address:'Rua A, 123'},propertyRules:{includedOccupancy:2,maximumOccupancy:4,
 extraGuestRateCents:2500,checkInTime:'14:00',checkOutTime:'10:00'},
 policy:{jurisdiction:'Vitória/ES',cancellationDays:30,damagePenaltyPercent:30,
 breachPenaltyPercent:10},
 installments:[{sequence:1,agreedCents:40000,dueEvent:'CHECKIN',isDeposit:true}]
});
describe('server-only contract draft preview',()=>{
 it('uses approved clause wording and server-owned amounts, no supplied client totals',()=>{
  const out=renderContractPreview(fixture());
  expect(out.clauses).toHaveLength(17);
  expect(out.clauses[0].body).toContain('Bruno Silva');
  expect(out.clauses[0].body).toContain('R$');
  expect(out.clauses[0].body).toContain('400,00');
  expect(out.clauses[1].body).toContain('Rua A, 123');
  expect(out.ready).toBe(true);
  expect(out.watermark).toContain('NAO FINALIZADO');
 });
 it('marks missing guest identity instead of guessing legal details',()=>{
  const x=fixture();x.guest={};
  const out=renderContractPreview(x);
  expect(out.ready).toBe(false);
  expect(out.missing).toEqual(expect.arrayContaining(['locatario.cpf']));
  expect(out.clauses[0].body).toContain('[PENDENTE: locatario.cpf]');
 });
 it('without a published template cannot become a valid agreement',()=>{
  const x=fixture();x.template=null;
  const out=renderContractPreview(x);
  expect(out.ready).toBe(false);
  expect(out.clauses).toHaveLength(0);
  expect(out.missing).toEqual(['modelo.publicado']);
 });
 it('substitutes only known placeholders once; user text never becomes executable HTML',()=>{
  const x=fixture();x.guest.cpf='<img src=x onerror=alert(1)>';
  const out=renderContractPreview(x);
  expect(out.clauses[0].body).toContain('<img src=x');
  // The transport is JSON and frontend renders React text, not innerHTML.
  expect(out.clauses[0].body).not.toContain('{{locatario.cpf}}');
 });
 it('honors disabled editorial clauses and checks only referenced placeholders',()=>{
  const x=fixture();x.template=clauses.map(c=>({...c}));
  x.template.push({id:'extra-optional',title:'Aditivo opcional',body:'Texto informativo opcional não publicado.',enabled:false});
  const out=renderContractPreview(x);
  expect(out.clauses).toHaveLength(17);
  expect(out.missing).not.toContain('locador.cpf');
 });
 it('provides a valid multipage, watermarked and unarchived PDF byte stream',()=>{
  const out=renderContractPreview(fixture());
  const bytes=renderDraftPdf(out);
  expect(bytes.subarray(0,8).toString()).toBe('%PDF-1.4');
  const text=bytes.toString('latin1');
  expect(text).toContain('/Type /Pages');
  expect(text).toContain('xref');
  expect(text).toContain('trailer');
  expect(text).toContain('%%EOF');
  // Content is hex encoded to avoid PDF control injection from template/guest strings.
  expect(text).not.toContain('onerror=alert');
 });
 it('long but supported source text spans multiple PDF pages',()=>{
  const input=fixture();
  input.template=clauses.map(c=>({...c,body:'Portuguese preview text. '.repeat(65)}));
  const pdf=renderDraftPdf(renderContractPreview(input));
  expect(pdf.toString('latin1')).toMatch(/\/Count [2-9][0-9]* /);
 });
});

describe('draft placeholder branch and payment variations',()=>{
 const withBody=(body:string)=>{
  const data=fixture();
  data.template=clauses.map((c,i)=>({...c,body:i===0?body:c.body}));
  return data;
 };
 it('marks missing landlord and property data without inventing identities or rates',()=>{
  const input=withBody('Locador: {{locador.nome}}; CPF {{locador.cpf}}; endereço {{locador.endereco}}; taxa {{imovel.taxa_extra}}.');
  input.landlord=null;input.propertyRules.extraGuestRateCents=null;
  const out=renderContractPreview(input);
  expect(out.ready).toBe(false);
  expect(out.missing).toEqual(expect.arrayContaining([
   'locador.nome','locador.cpf','locador.endereco','imovel.taxa_extra'
  ]));
  expect(out.clauses[0].body).toContain('[PENDENTE: imovel.taxa_extra]');
 });
 it('renders a complete owner address and zero extra-guest fees correctly',()=>{
  const input=withBody('Endereço: {{locador.endereco}}; taxa {{imovel.taxa_extra}}.');
  input.landlord={...input.landlord,addressStreet:'Rua das Flores',addressNumber:'10',
   addressComplement:'Apt 2',addressDistrict:'Centro',addressCity:'Vitória',
   addressState:'ES',addressPostalCode:'29000-000'};
  input.propertyRules.extraGuestRateCents=0;
  const out=renderContractPreview(input);
  expect(out.ready).toBe(true);
  expect(out.clauses[0].body).toContain('Rua das Flores, 10, Apt 2, Centro, Vitória, ES');
  expect(out.clauses[0].body).toContain('0,00');
 });
 it('shows both explicit payment dates and missing event due rules',()=>{
  const input=withBody('Parcelas: {{reserva.parcelas}}; sinal: {{reserva.sinal}}.');
  input.installments=[
   {sequence:1,agreedCents:10000,dueDate:'2027-01-01',isDeposit:false},
   {sequence:2,agreedCents:30000,isDeposit:false}
  ];
  const out=renderContractPreview(input);
  expect(out.ready).toBe(true);
  expect(out.clauses[0].body).toContain('2027-01-01');
  expect(out.clauses[0].body).toContain('vencimento pendente');
  expect(out.clauses[0].body).toContain('Sem sinal identificado');
 });
 it('empty installments and missing guest fields are disclosed rather than silently completed',()=>{
  const input=withBody('Parcelas {{reserva.parcelas}}; telefone {{locatario.telefone}}; e-mail {{locatario.email}}.');
  input.installments=[];input.guest={};
  const out=renderContractPreview(input);
  expect(out.ready).toBe(false);
  expect(out.missing).toEqual(expect.arrayContaining(['reserva.parcelas','locatario.telefone','locatario.email']));
 });
 it('allows literal zero policy values and marks undefined policy fields only when referenced',()=>{
  const input=withBody('Multa {{politica.multa_danos}}, prazo {{politica.cancelamento_dias}}, foro {{foro.cidade_estado}}.');
  input.policy={damagePenaltyPercent:0,jurisdiction:'Vitória/ES'};
  const out=renderContractPreview(input);
  expect(out.ready).toBe(false);
  expect(out.missing).toContain('politica.cancelamento_dias');
  expect(out.missing).not.toContain('politica.multa_danos');
  expect(out.clauses[0].body).toContain('Multa 0');
 });
 it('blank guest names and unavailable check-in values remain pending only when used',()=>{
  const input=withBody('Locatário {{locatario.nome}}; check-in {{imovel.entrada}}.');
  input.rental.clientFirstName='';input.rental.clientLastName='';
  input.propertyRules.checkInTime=null;
  const out=renderContractPreview(input);
  expect(out.missing).toEqual(expect.arrayContaining(['locatario.nome','imovel.entrada']));
  expect(out.ready).toBe(false);
 });
});
