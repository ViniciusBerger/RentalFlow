import {canonicalLandlordProfile,landlordDocument,landlordIdentityMissingFields,
 normalizeCnpj,validateBrazilianCnpj} from './landlord-identity';

const common={fullName:'Empresa Teste Ltda',addressStreet:'Rua A',addressNumber:'9',
 addressDistrict:'Centro',addressCity:'Vitória',addressState:'ES',addressPostalCode:'29000-000'};
const company={...common,documentType:'CNPJ' as const,cnpj:'00.000.000/E08G-12',
 representativeName:'Ana Silva',representativeCpf:'52998224725',representativeRole:'Sócia-administradora'};
describe('CPF and 2026 alphanumeric CNPJ support',()=>{
 it('accepts Receita Federal first real alphanumeric CNPJ plus numeric legacy formats',()=>{
  expect(validateBrazilianCnpj('00.000.000/E08G-12')).toBe(true);
  expect(validateBrazilianCnpj('00.000.000/e08g-12')).toBe(true);
  expect(validateBrazilianCnpj('04.252.011/0001-10')).toBe(true);
  expect(normalizeCnpj('00.000.000/e08g-12')).toBe('00000000E08G12');
 });
 it('rejects incorrect check digits, punctuation, non-ASCII and size',()=>{
  for(const value of ['00.000.000/E08G-13','04.252.011/0001-11',
   '00.000.000/E08G-1A','00.000.000/E08G','ABCDEFGHIJKLMN','00000000000000',
   '00.000.000/E08?-12','00.000.000/É08G-12']){
   expect(validateBrazilianCnpj(value)).toBe(false);
  }
 });
 it('allows complete company representation and requires its signatory identity',()=>{
  expect(landlordIdentityMissingFields(company)).toEqual([]);
  expect(landlordIdentityMissingFields({...company,representativeCpf:'abc'})).toContain('representativeCpf');
  expect(landlordIdentityMissingFields({...company,representativeRole:''})).toContain('representativeRole');
  expect(landlordIdentityMissingFields({...company,cnpj:'invalid'})).toContain('cnpj');
 });
 it('retains legacy individual landlords and rejects wrong personal CPF/RG',()=>{
  const person={...common,cpf:'52998224725',rg:'123456'};
  expect(landlordIdentityMissingFields(person)).toEqual([]);
  expect(landlordIdentityMissingFields({...person,cpf:'11111111111'})).toContain('cpf');
  expect(landlordIdentityMissingFields({...person,rg:''})).toContain('rg');
  expect(landlordDocument(person)).toEqual({type:'CPF',value:'52998224725'});
 });
 it('does not allow cross-type identity fields to survive changes of landlord type',()=>{
  expect(canonicalLandlordProfile({...company,cpf:'52998224725',rg:'123'})).not.toHaveProperty('cpf');
  expect(canonicalLandlordProfile({...company,cpf:'52998224725'}).cnpj).toBe('00000000E08G12');
  const p=canonicalLandlordProfile({...company,documentType:'CPF',cpf:'52998224725',rg:'1234'});
  expect(p).not.toHaveProperty('cnpj');
  expect(p).not.toHaveProperty('representativeCpf');
  expect(landlordDocument(company)).toEqual({type:'CNPJ',value:'00000000E08G12'});
 });
 it('checks malformed common and optional fields plus malicious document types',()=>{
  const invalid={...company,documentType:'PASSPORT' as never,fullName:'a',addressState:'Unknown',
   addressPostalCode:'!@',addressStreet:'',addressNumber:'',addressDistrict:'',addressCity:'',
   email:'invalid',phone:'no'};
  const fields=landlordIdentityMissingFields(invalid);
  for(const field of ['documentType','fullName','addressState','addressPostalCode','addressStreet',
   'addressNumber','addressDistrict','addressCity','email','phone'])expect(fields).toContain(field);
 });
});
