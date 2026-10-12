import {renderFinalContractPdf} from './contract-final-pdf';
describe('finalized PDF rendering',()=>{
 const clauses=Array.from({length:17},(_,i)=>({id:String(i),title:'Cláusula '+(i+1),
  body:'Locação por temporada: São Paulo, Vitória, João, R$ 750,00. Número '+i+'.'}));
 it('generates an embedded-font multi-clause PDF without draft watermark or exposed source',async()=>{
  const pdf=await renderFinalContractPdf({contractId:'33333333-3333-4333-8333-333333333333',
   version:1,finalizedAt:new Date('2026-10-11T20:00:00Z'),clauses});
  expect(pdf.subarray(0,5).toString('ascii')).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(1000);
  expect(pdf.toString('latin1')).not.toContain('RASCUNHO');
 });
 it('rejects incomplete contract clauses',async()=>{
  await expect(renderFinalContractPdf({contractId:'x',version:1,
   finalizedAt:new Date(),clauses:[{id:'1',title:'',body:'[PENDENTE: cpf]'}]})).rejects.toThrow();
 });
});
