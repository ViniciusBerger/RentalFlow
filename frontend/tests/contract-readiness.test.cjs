const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_QUESTIONNAIRE_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {ContractReadinessBanner}=require('../src/features/contracts/readiness-banner.tsx');
const next=()=>new Promise(resolve=>setImmediate(resolve));
const {LanguageContext}=require('../src/i18n/context.ts');
const oldLanguage=LanguageContext._currentValue;
const originalFetch=global.fetch;
afterEach(()=>{global.fetch=originalFetch;LanguageContext._currentValue=oldLanguage});
function findAll(node,predicate,result=[]){
 if(!node||typeof node!=='object')return result;
 if(Array.isArray(node)){for(const n of node)findAll(n,predicate,result);return result;}
 if(predicate(node))result.push(node);
 findAll(node.props?.children,predicate,result);return result;
}
test('red dashboard alert describes backend-certified missing fields and actionable destinations',async()=>{
 let request;
 global.fetch=async (url,init)=>{
  request={url,init};
  return {ok:true,json:async()=>({ready:false,issues:[
   {code:'LANDLORD_DETAILS',fields:['cpf','addressStreet']},
   {code:'PROPERTY_SETTINGS',propertyId:'p1',propertyName:'Casa',fields:['maximumOccupancy']},
   {code:'DRAFT_CONTRACTS',count:2}
  ]})};
 };
 const ui=mount(ContractReadinessBanner);
 await next();await next();ui.render();
 assert.equal(request.url,'http://localhost:3000/contracts/readiness');
 assert.equal(request.init.credentials,'include');
 assert.equal(request.init.cache,'no-store');
 const section=findAll(ui.tree,n=>n.type==='section'&&n.props.role==='alert')[0];
 assert.ok(section);
 const links=findAll(section,n=>typeof n.props?.to==='string');
 assert.equal(links.length,3);
 assert.deepEqual(links.map(x=>x.props.to),['/contracts/setup','/contracts/setup','/contracts']);
 const strings=JSON.stringify(section);
 assert.match(strings,/cpf|CPF/);
 assert.match(strings,/maximumOccupancy|Maximum occupancy/);
 assert.doesNotMatch(strings,/secretkey/i);
});
test('no red alert when all published settings are complete',async()=>{
 global.fetch=async()=>({ok:true,json:async()=>({ready:true,issues:[]})});
 const ui=mount(ContractReadinessBanner);
 await next();await next();ui.render();
 assert.equal(findAll(ui.tree,n=>n.type==='section'&&n.props.role==='alert').length,0);
});
test('readiness endpoint outage is explicitly warned, never shown as ready',async()=>{
 global.fetch=async()=>({ok:false,status:503,json:async()=>({message:'Down'})});
 const ui=mount(ContractReadinessBanner);
 await next();await next();ui.render();
 assert.equal(findAll(ui.tree,n=>n.type==='section'&&n.props.role==='alert').length,1);
});

test('Portuguese warning labels, missing property links and unknown field labels remain usable',async()=>{
 LanguageContext._currentValue={locale:'pt-BR',t:()=>'',setLocale:()=>{}};
 global.fetch=async()=>({ok:true,json:async()=>({ready:false,issues:[
  {code:'ACCOUNT_SETTINGS'},
  {code:'NO_ACTIVE_PROPERTIES'},
  {code:'PROPERTY_ADDRESS',propertyId:'p2',propertyName:'Apartamento',fields:['address']},
  {code:'PAYMENT_DETAILS',fields:['bankAgency','customKey']},
  {code:'DRAFT_CONTRACTS',count:1}
 ]})});
 const ui=mount(ContractReadinessBanner);
 await next();await next();ui.render();
 const section=findAll(ui.tree,n=>n.type==='section'&&n.props.role==='alert')[0];
 assert.ok(section);
 const links=findAll(section,n=>typeof n.props?.to==='string');
 assert.deepEqual(links.map(x=>x.props.to),[
  '/contracts/setup','/properties','/properties','/contracts/setup','/contracts'
 ]);
 const output=JSON.stringify(section);
 assert.match(output,/Pendências do contrato/);
 assert.match(output,/Agência/);
 assert.match(output,/customKey/);
 assert.match(output,/Apartamento/);
});
test('English banner supports details with no optional fields, property or unfinished count',async()=>{
 global.fetch=async()=>({ok:true,json:async()=>({ready:false,issues:[
  {code:'TEMPLATE_NOT_PUBLISHED'}, {code:'TEMPLATE_INVALID'}, {code:'JURISDICTION',fields:[]}
 ]})});
 const ui=mount(ContractReadinessBanner);
 await next();await next();ui.render();
 const section=findAll(ui.tree,n=>n.type==='section'&&n.props.role==='alert')[0];
 assert.ok(section);
 assert.match(JSON.stringify(section),/Contract setup warnings/);
 assert.match(JSON.stringify(section),/Contract wording has not been published/);
 assert.equal(findAll(section,n=>typeof n.props?.to==='string').length,3);
});
