const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_QUESTIONNAIRE_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const {ContractQuestionnairePage}=require('../src/features/contracts/index.tsx');
const {initialPolicy,initialPayment}=require('../src/features/contracts/contract-api.ts');
const {property}= {property:{id:'550e8400-e29b-41d4-a716-446655440001',name:'Casa Praia',address:'Rua 12',isActive:true}};
const scaffold=Array.from({length:17},(_,i)=>({id:i===16?'annex':String(i+1),title:i===16?'Anexo I':'Cláusula '+(i+1),body:'Texto original conferido por responsável.',enabled:true}));
const makeResponse=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const original=global.fetch;
const sleep=()=>new Promise(resolve=>setImmediate(resolve));
const find=(node,predicate)=>{
 if(!node||typeof node!=='object')return null;
 if(Array.isArray(node))return node.map(x=>find(x,predicate)).find(Boolean)||null;
 if(predicate(node))return node;
 return find(node.props?.children,predicate);
};
const all=(node,predicate,results=[])=>{
 if(!node||typeof node!=='object')return results;
 if(Array.isArray(node)){for(const x of node)all(x,predicate,results);return results;}
 if(predicate(node))results.push(node);
 all(node.props?.children,predicate,results);
 return results;
};
function api(opts={}){
 const calls=[];
 global.fetch=async (url,init)=>{
  const path=String(url);calls.push({path,init});
  if(path.endsWith('/auth/csrf'))return makeResponse({csrfToken:'fixture-csrf-session-token'});
  if(path.endsWith('/contracts/settings'))return init?.method==='PUT'?makeResponse({saved:true}):makeResponse({
   landlord:{},policy:initialPolicy,payment:initialPayment,configured:false
  });
  if(path.endsWith('/contracts/template'))return makeResponse({
   draft:opts.existing?{id:'550e8400-e29b-41d4-a716-446655440006',versionNumber:2,clauses:scaffold}:null,
   published:opts.existing?{id:'550e8400-e29b-41d4-a716-446655440005',versionNumber:1,publishedAt:'2026-10-11',clauses:scaffold}:null,
   scaffold:opts.blank?scaffold.map(x=>({...x,body:''})):scaffold
  });
  if(path.endsWith('/properties'))return makeResponse(opts.noProperties?[]:[property]);
  if(path.endsWith('/contracts/properties/'+property.id+'/settings'))return init?.method==='PUT'?
   makeResponse({saved:true}):makeResponse({property,settings:opts.existing?{
      includedOccupancy:10,maximumOccupancy:12,extraGuestRateCents:25000,
      checkInTime:'14:00',checkOutTime:'17:00',providesLinen:false,hasPool:true,houseRules:['Quiet hours']
    }:null});
  if(path.endsWith('/contracts/template/draft'))return makeResponse({id:'550e8400-e29b-41d4-a716-446655440002',versionNumber:1});
  if(path.endsWith('/contracts/template/publish'))return makeResponse({id:'550e8400-e29b-41d4-a716-446655440002',versionNumber:1});
  return makeResponse({message:'No mock route'},404);
 };
 return calls;
}
async function loaded(){
 const view=mount(ContractQuestionnairePage);
 for(let i=0;i<4;i++){await sleep();view.render();}
 return view;
}
function step(view,index){
 const nav=find(view.tree,n=>n.type==='nav'&&n.props.className==='rf-contract-steps');
 const buttons=all(nav,n=>n.type==='button');
 assert.equal(buttons.length,6);
 buttons[index].props.onClick();
 view.render();
}
async function clickButton(view,label){
 const button=all(view.tree,n=>n.type==='button').find(n=>{
  const children=Array.isArray(n.props.children)?n.props.children:[n.props.children];
  return children.some(x=>x===label);
 });
 assert.ok(button,'Missing button '+label);
 const result=button.props.onClick();await sleep();await sleep();return result;
}
afterEach(()=>{global.fetch=original;clearCsrfToken();});
test('complete questionaire works across all six steps without client-side authoritative flags',async()=>{
 const calls=api(),view=await loaded();
 let inputs=all(view.tree,n=>n.type==='input');
 assert.ok(inputs.length>=10);
 inputs[0].props.onChange({target:{value:'Ana Silva'}});
 view.render();
 await clickButton(view,'Save settings');
 assert.equal(calls.some(x=>x.path.endsWith('/contracts/settings')&&x.init?.method==='PUT'),true);
 const request=calls.find(x=>x.path.endsWith('/contracts/settings')&&x.init?.method==='PUT');
 assert.equal(JSON.parse(request.init.body).landlord.fullName,'Ana Silva');
 assert.equal(request.init.headers.get('X-CSRF-Token'),'fixture-csrf-session-token');
 assert.equal('userId' in JSON.parse(request.init.body),false);
 step(view,1);
 inputs=all(view.tree,n=>n.type==='input');
 const count=inputs.find(n=>n.props.type==='number');count.props.onChange({target:{value:'3'}});
 const toggles=inputs.filter(n=>n.props.type==='checkbox');toggles[2].props.onChange({target:{checked:true}});
 const select=all(view.tree,n=>n.type==='select');
 select[0].props.onChange({target:{value:'CHECKIN'}});
 select[1].props.onChange({target:{value:'NONE'}});
 view.render();await clickButton(view,'Save settings');
 step(view,2);
 inputs=all(view.tree,n=>n.type==='input');
 const place=inputs.find(n=>n.props.placeholder==='Vila Velha/ES');place.props.onChange({target:{value:'Vitória/ES'}});
 const numbers=inputs.filter(n=>n.props.type==='number');
 numbers[0].props.onChange({target:{value:'45'}});
 inputs.find(n=>n.props.type==='checkbox').props.onChange({target:{checked:false}});
 view.render();await clickButton(view,'Save settings');
 step(view,3);await sleep();view.render();
 const propertySelect=all(view.tree,n=>n.type==='select')[0];propertySelect.props.onChange({target:{value:property.id}});view.render();
 inputs=all(view.tree,n=>n.type==='input');
 const occupied=inputs.filter(n=>n.props.type==='number');
 occupied[0].props.onChange({target:{value:'10'}});occupied[1].props.onChange({target:{value:'12'}});
 occupied[2].props.onChange({target:{value:'25000'}});
 const time=inputs.find(n=>n.props.type==='time');time.props.onChange({target:{value:'15:00'}});
 inputs.find(n=>n.props.type==='checkbox').props.onChange({target:{checked:true}});
 const textarea=find(view.tree,n=>n.type==='textarea');
 textarea.props.onChange({target:{value:'Silêncio após 22h\nSem música alta'}});
 view.render();await clickButton(view,'Save property rules');
 const saved=calls.find(x=>x.init?.method==='PUT'&&x.path.includes('/contracts/properties/'));
 assert.equal(JSON.parse(saved.init.body).maximumOccupancy,12);
 assert.equal(JSON.parse(saved.init.body).houseRules.length,2);
 step(view,4);
 const clauseTitle=all(view.tree,n=>n.type==='input').find(n=>n.props.maxLength===120);
 clauseTitle.props.onChange({target:{value:'Regras adicionais'}});view.render();
 const clauseText=all(view.tree,n=>n.type==='textarea');
 clauseText[0].props.onChange({target:{value:'Texto original revisado para a propriedade.'}});
 await clickButton(view,'Add optional clause');
 view.render();assert.ok(all(view.tree,n=>n.type==='details').length>=18);
 const optionalToggle=all(view.tree,n=>n.type==='input').find(n=>n.props.type==='checkbox');
 optionalToggle.props.onChange({target:{checked:true}});view.render();
 const remove=all(view.tree,n=>n.type==='button').find(n=>n.props.children==='Remove');
 assert.ok(remove);remove.props.onClick();view.render();
 await clickButton(view,'Save draft');
 assert.equal(calls.some(x=>x.path.endsWith('/contracts/template/draft')),true);
 step(view,5);
 const approval=find(view.tree,n=>n.type==='input'&&n.props.type==='checkbox');
 approval.props.onChange({target:{checked:true}});view.render();
 const previous=global.window;global.window={confirm:()=>true};
 try{await clickButton(view,'Publish template');}finally{global.window=previous;}
 view.render();
 assert.equal(calls.some(x=>x.path.endsWith('/contracts/template/publish')),true);
});
test('blank draft and properties absent are not treated as published documents',async()=>{
 api({noProperties:true,blank:true});
 const view=await loaded();
 step(view,3);
 assert.equal(all(view.tree,n=>n.type==='input').length,0);
 assert.doesNotMatch(JSON.stringify(view.tree),/52998224725/);
 step(view,4);
 assert.equal(all(view.tree,n=>n.type==='details').length,17);
 step(view,5);
 const agree=find(view.tree,n=>n.type==='input'&&n.props.type==='checkbox');
 agree.props.onChange({target:{checked:true}});view.render();
 const publish=all(view.tree,n=>n.type==='button').find(n=>String(n.props.children).includes('Publish template'));
 // No saved draft ID means an approved checkbox cannot enable finalization.
 assert.ok(publish?.props.disabled);
});

test('server errors on questionnaire requests show feedback and never fake success',async()=>{
 const calls=api(),view=await loaded();
 const originalFetch=global.fetch;
 global.fetch=async (url,init)=>{
  if(String(url).endsWith('/contracts/settings')&&init?.method==='PUT')return makeResponse({message:['CPF is invalid','Missing details']},400);
  return originalFetch(url,init);
 };
 await clickButton(view,'Save settings');view.render();
 assert.ok(find(view.tree,n=>n.props?.role==='alert'));
 assert.ok(calls.some(x=>x.path.endsWith('/contracts/settings')));
 step(view,4);
 global.fetch=async (url,init)=>{
  if(String(url).endsWith('/contracts/template/draft'))return makeResponse({message:'Template unavailable'},503);
  return originalFetch(url,init);
 };
 await clickButton(view,'Save draft');view.render();
 assert.ok(find(view.tree,n=>n.props?.role==='alert'));
});
test('failed initial load is shown safely and does not expose fake contract fields',async()=>{
 api();global.fetch=async()=>{throw new Error('Network unavailable')};
 const view=await loaded();view.render();
 assert.ok(find(view.tree,n=>n.props?.role==='alert'));
 assert.doesNotMatch(JSON.stringify(view.tree),/52998224725/);
});
test('property configuration errors show feedback while retaining previously loaded account settings',async()=>{
 api();const view=await loaded();
 step(view,3);await sleep();view.render();
 const previous=global.fetch;
 global.fetch=async (url,init)=>{
  if(String(url).includes('/contracts/properties/')&&init?.method==='PUT')return makeResponse({},500);
  return previous(url,init);
 };
 await clickButton(view,'Save property rules');view.render();
 assert.ok(find(view.tree,n=>n.props?.role==='alert'));
});
test('contract API refuses malformed backend responses and preserves HTTP error status',async()=>{
 const {readSettings,readTemplate,saveTemplateDraft}=require('../src/features/contracts/contract-api.ts');
 global.fetch=async()=>({ok:false,status:400,json:async()=>{throw Error('invalid JSON')}});
 await assert.rejects(readSettings(),/HTTP 400/);
 global.fetch=async()=>makeResponse({message:['Invalid clause','Missing annex']},422);
 await assert.rejects(readTemplate(),/Invalid clause; Missing annex/);
 global.fetch=async(url)=>String(url).endsWith('/auth/csrf')?
   makeResponse({csrfToken:'fixture-csrf-session-token'}):makeResponse({message:'Draft cannot be saved'},409);
 await assert.rejects(saveTemplateDraft(scaffold),/Draft cannot be saved/);
});
test('wizard next/back navigation works and cancelled publication does not send a request',async()=>{
 const calls=api(),view=await loaded();
 await clickButton(view,'Next');view.render();
 assert.ok(find(view.tree,n=>n.type==='h3'));
 await clickButton(view,'Back');view.render();
 step(view,4);await clickButton(view,'Save draft');view.render();
 step(view,5);
 const approve=find(view.tree,n=>n.type==='input'&&n.props.type==='checkbox');
 approve.props.onChange({target:{checked:true}});view.render();
 const oldWindow=global.window;global.window={confirm:()=>false};
 try{await clickButton(view,'Publish template')}finally{global.window=oldWindow}
 assert.equal(calls.filter(x=>x.path.endsWith('/contracts/template/publish')).length,0);
});

test('existing published version and draft are both loaded without overwriting the tenant data',async()=>{
 const calls=api({existing:true}),view=await loaded();
 step(view,3);await sleep();view.render();
 const rules=find(view.tree,n=>n.type==='textarea');
 assert.ok(rules);
 assert.equal(rules.props.value,'Quiet hours');
 step(view,5);
 assert.ok(all(view.tree,n=>n.type==='p').some(x=>String(x.props.children).includes('Latest published version')));
 const approve=find(view.tree,n=>n.type==='input'&&n.props.type==='checkbox');
 approve.props.onChange({target:{checked:true}});view.render();
 assert.equal(calls.some(x=>x.path.endsWith('/contracts/template')),true);
});
