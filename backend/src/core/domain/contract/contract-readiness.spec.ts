import {readinessIssues} from './contract-readiness';
import {emptyContractClauses,defaultPayment,defaultPolicy} from './contract-questionnaire';

const configured={
 configured:true,
 landlord:{fullName:'Maria Lopes',cpf:'52998224725',rg:'1234567',addressStreet:'Rua das Flores',
  addressNumber:'10',addressDistrict:'Centro',addressCity:'Vitoria',addressState:'ES',addressPostalCode:'29000000',
  pixKey:'chave',bankName:'Banco',bankAgency:'123',bankAccount:'456'},
 policy:{...defaultPolicy,jurisdiction:'Vitoria/ES'},
 payment:defaultPayment,
 publishedClauses:emptyContractClauses().map(c=>({...c,body:'Texto legal aprovado pela proprietaria.'})),
 properties:[{id:'p1',name:'Casa',address:'Rua 1',settings:{
  includedOccupancy:2,maximumOccupancy:5,extraGuestRateCents:3000,
  checkInTime:'14:00:00',checkOutTime:'11:00:00'}}],
 draftCount:0
};
describe('contract readiness is evaluated on authoritative saved state',()=>{
 it('accepts complete published account and active property',()=>expect(readinessIssues(configured)).toEqual([]));
 it('shows precisely which landlord and payment fields are missing without exposing their values',()=>{
  const issues=readinessIssues({...configured,landlord:{fullName:'X'},policy:defaultPolicy});
  expect(issues.find(i=>i.code==='LANDLORD_DETAILS')?.fields).toContain('cpf');
  expect(issues.find(i=>i.code==='PAYMENT_DETAILS')?.fields).toContain('pixKey');
  expect(issues.some(i=>i.code==='JURISDICTION')).toBe(true);
  expect(JSON.stringify(issues)).not.toContain('52998224725');
 });
 it('reports missing publications and incomplete per-property rules with actionable property ID',()=>{
  const issues=readinessIssues({...configured,publishedClauses:null,
   properties:[{id:'property-1',name:'Flat',address:null,settings:null}],draftCount:2});
  expect(issues.map(i=>i.code)).toEqual([
   'TEMPLATE_NOT_PUBLISHED','PROPERTY_ADDRESS','PROPERTY_SETTINGS','DRAFT_CONTRACTS'
  ]);
  expect(issues.find(i=>i.code==='PROPERTY_SETTINGS')?.propertyId).toBe('property-1');
  expect(issues.find(i=>i.code==='DRAFT_CONTRACTS')?.count).toBe(2);
 });
 it('recognizes no active properties and unpublished original clause text',()=>{
  const issues=readinessIssues({...configured,properties:[],
   publishedClauses:emptyContractClauses()});
  expect(issues.some(i=>i.code==='NO_ACTIVE_PROPERTIES')).toBe(true);
  expect(issues.some(i=>i.code==='TEMPLATE_INVALID')).toBe(true);
 });

 it('flags malformed optional contact details and invalid payment options',()=>{
  const issues=readinessIssues({...configured,
   landlord:{...configured.landlord,email:'bad@@example',phone:'!',pixKey:'',bankName:''},
   payment:{...defaultPayment,acceptedMethods:['PIX','BANK_TRANSFER','PIX']}
  });
  expect(issues.find(i=>i.code==='LANDLORD_DETAILS')?.fields).toEqual(expect.arrayContaining(['email','phone']));
  expect(issues.find(i=>i.code==='PAYMENT_METHODS')).toBeDefined();
  expect(issues.find(i=>i.code==='PAYMENT_DETAILS')?.fields).toEqual(expect.arrayContaining(['pixKey','bankName']));
 });
 it('reports missing per-property occupancy fields separately from property address',()=>{
  const issues=readinessIssues({...configured,properties:[
   {id:'p2',name:'Second',address:'Somewhere',settings:{
    includedOccupancy:null,maximumOccupancy:1,extraGuestRateCents:null,checkInTime:null,checkOutTime:''}},
   {id:'p3',name:'Third',address:'Rua 7',settings:{
    includedOccupancy:5,maximumOccupancy:2,extraGuestRateCents:-1,checkInTime:'invalid',checkOutTime:'11:00'}}
  ]});
  const missing=issues.filter(i=>i.code==='PROPERTY_SETTINGS');
  expect(missing).toHaveLength(2);
  expect(missing[0].fields).toEqual(expect.arrayContaining(['includedOccupancy','extraGuestRateCents','checkInTime','checkOutTime']));
  expect(missing[1].fields).toEqual(expect.arrayContaining(['maximumOccupancy','extraGuestRateCents','checkInTime']));
 });
 it('flags missing account and landlord field formats without exposing supplied identity',()=>{
  const issues=readinessIssues({...configured,configured:false,landlord:{
   ...configured.landlord,cpf:'invalid',addressState:'xxx',addressPostalCode:'bad',rg:'a',fullName:'Ab'
  }});
  expect(issues[0].code).toBe('ACCOUNT_SETTINGS');
  expect(issues.find(i=>i.code==='LANDLORD_DETAILS')?.fields).toEqual(expect.arrayContaining([
   'fullName','cpf','rg','addressState','addressPostalCode'
  ]));
 });
 it('accepts custom-only accepted payments without requesting PIX/bank details',()=>{
  const issues=readinessIssues({...configured,payment:{...defaultPayment,acceptedMethods:['CUSTOM']},
   landlord:{...configured.landlord,pixKey:'',bankName:'',bankAgency:'',bankAccount:''}});
  expect(issues).toEqual([]);
 });
});
