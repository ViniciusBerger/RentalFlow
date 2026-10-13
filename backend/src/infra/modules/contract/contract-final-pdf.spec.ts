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


describe('PDF landlord party identity labels',()=>{
 const clauses=Array.from({length:17},(_,i)=>({id:String(i),title:'Cláusula '+i,
  body:'Texto aprovado da temporada '+i+'; documentos e partes informados no cabeçalho.'}));
 const base={contractId:'33333333-3333-4333-8333-333333333333',
  version:1,finalizedAt:new Date('2026-10-11T20:00:00Z'),clauses};
 const common={guest:'Bruno Silva',guestCpf:'52998224725',property:'Rua 12',
  checkIn:'2027-01-01',checkOut:'2027-01-03',guests:2,totalCents:50000};
 it('renders company legal name and authorized representative in unsigned archive',async()=>{
  const b=await renderFinalContractPdf({...base,summary:{...common,
   landlord:'Praia Rentals Ltda',landlordDocumentLabel:'CNPJ',landlordDocument:'00000000E08G12',
   representativeName:'Ana Silva',representativeCpf:'52998224725',representativeRole:'Diretora'}});
  expect(b.subarray(0,5).toString()).toBe('%PDF-');
 });
 it('preserves individual identity label without a company representative',async()=>{
  const b=await renderFinalContractPdf({...base,summary:{...common,
   landlord:'Ana de Souza',landlordDocumentLabel:'CPF',landlordDocument:'52998224725'}});
  expect(b.subarray(0,5).toString()).toBe('%PDF-');
 });
});
