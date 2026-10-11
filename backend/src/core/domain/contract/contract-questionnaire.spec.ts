import {BadRequestException} from '@nestjs/common';
import {emptyContractClauses,validateClauses,validateLandlordForPublish,
  defaultPolicy,defaultPayment} from './contract-questionnaire';
import type {ContractClause,LandlordProfile} from './contract-questionnaire';

const complete=():ContractClause[]=>emptyContractClauses().map(c=>({...c,body:'Texto original aprovado pelo locador para este parágrafo.'}));
const landlord:LandlordProfile={fullName:'Ana de Souza',cpf:'52998224725',rg:'12345678',addressStreet:'Rua das Flores',addressNumber:'120',addressDistrict:'Centro',addressCity:'Vitória',addressState:'ES',addressPostalCode:'29000-000',
 pixKey:'ana@example.test',bankName:'Banco Exemplo',bankAgency:'0001',bankAccount:'111-2'};

describe('seasonal contract template security and publication gates',()=>{
 it('offers sixteen empty original-text slots and a required annex instead of fabricated legal wording',()=>{
  const clauses=emptyContractClauses();expect(clauses).toHaveLength(17);
  expect(clauses.slice(0,16).map(c=>c.id)).toEqual(Array.from({length:16},(_,i)=>String(i+1)));
  expect(clauses[16].id).toBe('annex');
  expect(clauses.every(c=>c.body===''&&c.enabled)).toBe(true);
 });
 it('accepts a complete original contract and approved placeholder tokens as plain text',()=>{
  const clauses=complete();
  clauses[0].body='O imóvel {{imovel.endereco}} será utilizado pelo locatário {{locatario.nome}}.';
  expect(validateClauses(clauses,true)).toHaveLength(17);
 });
 it('allows incomplete contents only when saving a draft',()=>{
  expect(validateClauses(emptyContractClauses())).toHaveLength(17);
  expect(()=>validateClauses(emptyContractClauses(),true)).toThrow(BadRequestException);
 });
 it('does not allow disabled or missing mandatory clauses at publication',()=>{
  const disabled=complete();disabled[0].enabled=false;
  expect(()=>validateClauses(disabled,true)).toThrow();
  const missing=complete().slice(1);expect(()=>validateClauses(missing)).toThrow();
  const noAnnex=complete().filter(c=>c.id!=='annex');expect(()=>validateClauses(noAnnex)).toThrow();
  const emptyAnnex=complete();emptyAnnex[16].body='';
  expect(()=>validateClauses(emptyAnnex,true)).toThrow();
 });
 it('rejects duplicate identifiers, unknown identifiers and clause injections',()=>{
  const duplicates=complete();duplicates[1].id='1';
  expect(()=>validateClauses(duplicates)).toThrow();
  const evil=complete();evil[0].id='../../etc/passwd';
  expect(()=>validateClauses(evil)).toThrow();
  const badTitle=complete();badTitle[0].title='{{some.password}}';
  expect(()=>validateClauses(badTitle)).toThrow();
  const badLength=complete();badLength[0].title='X';
  expect(()=>validateClauses(badLength)).toThrow();
  const tooLong=complete();tooLong[0].body='x'.repeat(10001);
  expect(()=>validateClauses(tooLong)).toThrow();
 });
 it('rejects unrecognized or broken template placeholders',()=>{
  const bad=complete();bad[0].body='Use {{process.env.SECRET}} not allowed';
  expect(()=>validateClauses(bad)).toThrow('Unapproved contract placeholder');
  bad[0].body='Unclosed {{locador.nome';
  expect(()=>validateClauses(bad)).toThrow();
  bad[0].body='Unopened locador.nome}}';
  expect(()=>validateClauses(bad)).toThrow();
  bad[0].body='Entre em contato com ana@example.test';
  expect(()=>validateClauses(bad)).toThrow('Use placeholders');
  bad[0].body='CPF 529.982.247-25';
  expect(()=>validateClauses(bad)).toThrow('Use placeholders');
 });
 it('supports disabled optional clauses, but enabled extra clauses must be complete to publish',()=>{
  const extra={id:'extra-safe1',title:'Additional agreed rule',body:'',enabled:false};
  expect(validateClauses([...complete(),extra],true)).toHaveLength(18);
  expect(()=>validateClauses([...complete(),{...extra,enabled:true}],true)).toThrow();
  expect(validateClauses([...complete(),{...extra,enabled:true,body:'Additional original text confirmed by owner.'}],true)).toHaveLength(18);
 });
 it('enforces upper bounds and rejects nonsensical input forms',()=>{
  expect(()=>validateClauses([])).toThrow();
  expect(()=>validateClauses(Array(41).fill(complete()[0]))).toThrow();
  expect(()=>validateClauses(null as unknown as ContractClause[])).toThrow();
  const invalid=complete();(invalid[0] as unknown as {enabled:string}).enabled='true';
  expect(()=>validateClauses(invalid)).toThrow();
 });
 it('requires the server-valid Brazilian landlord identity and residential address',()=>{
  expect(()=>validateLandlordForPublish(landlord,{...defaultPolicy,jurisdiction:'Vila Velha/ES'},defaultPayment)).not.toThrow();
  expect(()=>validateLandlordForPublish(null,{...defaultPolicy,jurisdiction:'Vila Velha/ES'},defaultPayment)).toThrow();
  expect(()=>validateLandlordForPublish({...landlord,cpf:'11111111111'},{...defaultPolicy,jurisdiction:'Vila Velha/ES'},defaultPayment)).toThrow();
  expect(()=>validateLandlordForPublish({...landlord,addressStreet:''},{...defaultPolicy,jurisdiction:'Vila Velha/ES'},defaultPayment)).toThrow();
 });
 it('rejects invalid jurisdiction, missing payment methods, PIX or required bank details',()=>{
  const policy={...defaultPolicy,jurisdiction:'Vila Velha/ES'};
  expect(()=>validateLandlordForPublish(landlord,{...policy,jurisdiction:'?'},defaultPayment)).toThrow();
  expect(()=>validateLandlordForPublish(landlord,policy,{...defaultPayment,acceptedMethods:[]})).toThrow();
  expect(()=>validateLandlordForPublish({...landlord,pixKey:''},policy,defaultPayment)).toThrow();
  expect(()=>validateLandlordForPublish({...landlord,bankAccount:''},policy,defaultPayment)).toThrow();
  expect(()=>validateLandlordForPublish({...landlord,pixKey:'',bankName:''},policy,
   {...defaultPayment,acceptedMethods:['CUSTOM']})).not.toThrow();
 });
});

describe('additional contractual validation security boundaries',()=>{
 const policy={...defaultPolicy,jurisdiction:'Vitória/ES'};
 const source=():ContractClause[]=>emptyContractClauses().map(c=>({...c,body:'Texto original conferido e validado pelo locador.'}));
 it('rejects unknown or duplicated ID schemes, control characters and empty headings',()=>{
  for(const [id,title] of [['17','Title'],['extra-INVALID!!','Title'],['annex','Title'],['1','X'],['1','Control'+String.fromCharCode(0)]]){
   const input=source();if(id==='annex')input[0].id=id;else if(id==='1')input[0].title=title;else input[0].id=id;
   expect(()=>validateClauses(input)).toThrow();
  }
 });
 it('rejects malformed nested clauses and body types instead of trusting JS casts',()=>{
  for(const corrupt of [null,{},[],{id:1,title:'Ok',body:'Valid content',enabled:true},
   {id:'1',title:'Great',body:null,enabled:true},
   {id:'1',title:'Great',body:'Text',enabled:'true'}]){
   const input=source();(input as unknown[])[0]=corrupt;
   expect(()=>validateClauses(input)).toThrow();
  }
 });
 it('rejects advanced unresolved placeholders, missing originals, overly long content',()=>{
  const input=source();input[0].body='Hello {{imovel.endereco}} {{unknown.field}}';
  expect(()=>validateClauses(input)).toThrow();
  input[0].body='This {{ variable syntax} is broken';
  expect(()=>validateClauses(input)).toThrow();
  input[0].body='Hello {{imovel.endereco}';
  expect(()=>validateClauses(input)).toThrow();
  input[0].body='  ';
  expect(validateClauses(input)).toHaveLength(17);
  expect(()=>validateClauses(input,true)).toThrow();
  input[0].body='This is approved text';
  expect(validateClauses(input,true)).toHaveLength(17);
 });
 it('validates all required landlord fields and optional contact formats',()=>{
  for(const patch of [
   {fullName:''},{cpf:''},{rg:'x'},{addressNumber:''},{addressDistrict:''},
   {addressCity:''},{addressState:'ABC'},{addressPostalCode:'123'},{addressStreet:''},
   {email:'bad'},{phone:'invalid'}
  ]){
   expect(()=>validateLandlordForPublish({...landlord,...patch},policy,defaultPayment)).toThrow();
  }
  expect(()=>validateLandlordForPublish({...landlord,email:'owner@example.test',phone:'+55 27 99999-9999'},policy,defaultPayment)).not.toThrow();
 });
 it('does not require unused bank credentials when transfer method is disabled',()=>{
  expect(()=>validateLandlordForPublish({...landlord,bankAgency:'',bankAccount:'',bankName:''},policy,{
    ...defaultPayment,acceptedMethods:['PIX']
  })).not.toThrow();
  expect(()=>validateLandlordForPublish({...landlord,pixKey:''},policy,{...defaultPayment,acceptedMethods:['CUSTOM']})).not.toThrow();
 });
});

describe('remaining publication branch boundaries',()=>{
 it('rejects control bytes in headings and accepts nonempty whitespace formatting',()=>{
   const source=emptyContractClauses().map(c=>({...c,body:'Original seasonally approved text in full.'}));
   source[0].title='Header'+String.fromCharCode(0);
   expect(()=>validateClauses(source)).toThrow('Invalid clause heading');
   source[0].title='  Header  ';
   expect(validateClauses(source)[0].title).toBe('Header');
 });
 it('rejects malformed or missing original clauses even when list has 17 entries',()=>{
   const source=emptyContractClauses().map(c=>({...c,body:'Original approved text'}));
   source[2].id='extra-another';
   expect(()=>validateClauses(source)).toThrow('All 16 clauses are required');
   source[2].id='3';
   source[16].id='extra-another';
   expect(()=>validateClauses(source)).toThrow('House rules annex is required');
 });
 it('rejects missing key landlord fields via each validation short-circuit',()=>{
   const profile={...landlord};
   expect(()=>validateLandlordForPublish({...profile,fullName:'Jo'}, {...defaultPolicy,jurisdiction:'Vitória/ES'},defaultPayment)).toThrow();
   expect(()=>validateLandlordForPublish({...profile,cpf:'12345678900'}, {...defaultPolicy,jurisdiction:'Vitória/ES'},defaultPayment)).toThrow();
   expect(()=>validateLandlordForPublish({...profile,rg:''}, {...defaultPolicy,jurisdiction:'Vitória/ES'},defaultPayment)).toThrow();
 });
});
