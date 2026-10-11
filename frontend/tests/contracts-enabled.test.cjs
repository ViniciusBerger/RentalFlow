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
   draft:null,published:null,scaffold:opts.blank?scaffold.map(x=>({...x,body:''})):scaffold
  });
  if(path.endsWith('/properties'))return makeResponse(opts.noProperties?[]:[property]);
  if(path.endsWith('/contracts/properties/'+property.id+'/settings'))return init?.method==='PUT'?
   makeResponse({saved:true}):makeResponse({property,settings:null});
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
function clickButton(view,label){
 const button=all(view.tree,n=>n.type==='button').find(n=>{
  const children=Array.isArray(n.props.children)?n.props.children:[n.props.children];
  return children.some(x=>x===label);
 });
 assert.ok(button,'Missing button '+label);
 return button.props.onClick();
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
 const clauseText=all(view.tree,n=>n.type==='textarea');
 clauseText[0].props.onChange({target:{value:'Texto original revisado para a propriedade.'}});
 await clickButton(view,'Add optional clause');
 view.render();assert.ok(all(view.tree,n=>n.type==='details').length>=18);
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
 step(view,4);
 assert.equal(all(view.tree,n=>n.type==='details').length,17);
 step(view,5);
 const agree=find(view.tree,n=>n.type==='input'&&n.props.type==='checkbox');
 agree.props.onChange({target:{checked:true}});view.render();
 const publish=all(view.tree,n=>n.type==='button').find(n=>String(n.props.children).includes('Publish template'));
 // No saved draft ID means an approved checkbox cannot enable finalization.
 assert.ok(publish?.props.disabled);
});
