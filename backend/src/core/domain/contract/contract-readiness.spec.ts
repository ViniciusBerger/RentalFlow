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
});
