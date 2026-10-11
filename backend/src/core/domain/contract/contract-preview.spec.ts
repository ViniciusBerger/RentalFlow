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
  x.template[3].enabled=false;
  const out=renderContractPreview(x);
  expect(out.clauses).toHaveLength(16);
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
  expect(pdf.toString('latin1')).toContain('/Count 2');
 });
});
