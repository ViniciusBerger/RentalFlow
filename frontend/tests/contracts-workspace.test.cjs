const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_WORKSPACE_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const {ContractsWorkspacePage}=require('../src/features/contracts/workspace.tsx');
const id='33333333-3333-4333-8333-333333333333';
const original=global.fetch;
const ok=(data)=>({ok:true,status:200,json:async()=>data});
const item={id,rentalId:'22222222-2222-4222-8222-222222222222',
 propertyId:'11111111-1111-4111-8111-111111111111',propertyName:'Casa Azul',
 firstName:'Guest',lastName:'Test',startDate:'2027-01-01',endDate:'2027-01-03',
 guests:2,revenue:500,status:'DRAFT',revisionVersion:1};
const detail={id,booking:{clientFirstName:'Guest',clientLastName:'Test',startDate:'2027-01-01',
 endDate:'2027-01-03',guests:2,totalCents:50000},property:{name:'Casa Azul'},
 status:'DRAFT',revisionVersion:1,history:[],guest:{},installments:[],editToken:'a'.repeat(64),
 pricing:{},editable:true,preview:{clauses:[{id:'1',title:'Approved text',body:'Pending details'}],missing:[]}};
const next=()=>new Promise(resolve=>setImmediate(resolve));
const find=(x,p)=>!x||typeof x!=='object'?null:Array.isArray(x)?
 x.map(v=>find(v,p)).find(Boolean)||null:p(x)?x:find(x.props?.children,p);
afterEach(()=>{global.fetch=original;clearCsrfToken();});
test('contract workspace loads private list and server-rendered preview',async()=>{
 const calls=[];
 global.fetch=async(url)=>{const path=String(url);calls.push(path);
  return ok(path.endsWith('/workspace')?{items:[item]}:detail);};
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<5;i++){await next();view.render();}
 assert.ok(calls.some(x=>x.endsWith('/contracts/workspace')));
 assert.ok(calls.some(x=>x.endsWith('/workspace/'+id)));
 assert.ok(find(view.tree,x=>x.type==='div'&&x.props.className==='rf-contract-preview'));
});
test('contract workspace status filter hides unmatched records',async()=>{
 global.fetch=async(url)=>ok(String(url).endsWith('/workspace')?{items:[item]}:detail);
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<5;i++){await next();view.render();}
 const select=find(view.tree,x=>x.type==='select'&&x.props.value==='ALL');
 assert.ok(select);
 select.props.onChange({target:{value:'FINALIZED'}});
 view.render();
 assert.equal(find(view.tree,x=>x.type==='button'&&
  typeof x.props.className==='string'&&x.props.className.includes('rf-contract-workspace-item')),null);
});

test('contract search and property filters distinguish separate properties and preserve cancelled history',async()=>{
 const first={...item,cancelled:false,propertyId:'11111111-1111-4111-8111-111111111111'};
 const second={...item,id:'44444444-4444-4444-8444-444444444444',
  propertyId:'55555555-5555-4555-8555-555555555555',propertyName:'Cobertura',
  firstName:'Bruno',lastName:'Mendes',status:'FINALIZED',cancelled:false};
 const third={...item,id:'66666666-6666-4666-8666-666666666666',
  propertyId:second.propertyId,propertyName:'Cobertura',firstName:'Carlos',cancelled:true};
 global.fetch=async(url)=>ok(String(url).endsWith('/workspace')?{items:[first,second,third]}:detail);
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<6;i++){await next();view.render();}
 const options=(view.tree.props?.children||[]);
 const all=(x,p,acc=[])=>{
  if(!x||typeof x!=='object')return acc;
  if(Array.isArray(x)){x.forEach(v=>all(v,p,acc));return acc;}
  if(p(x))acc.push(x);
  all(x.props?.children,p,acc);return acc;
 };
 const count=()=>all(view.tree,n=>n.type==='button'&&
  typeof n.props.className==='string'&&n.props.className.includes('rf-contract-workspace-item')).length;
 assert.equal(count(),3);
 const dropdown=all(view.tree,n=>n.type==='select'&&n.props.value==='ALL')[1];
 assert.ok(dropdown);dropdown.props.onChange({target:{value:second.propertyId}});view.render();
 assert.equal(count(),2);
 const query=all(view.tree,n=>n.type==='input'&&n.props.type==='search')[0];
 query.props.onChange({target:{value:'BRUNO'}});view.render();
 assert.equal(count(),1);
 query.props.onChange({target:{value:'does not exist'}});view.render();
 assert.equal(count(),0);
});
test('cancelled filter keeps cancelled records while active finalized view excludes them',async()=>{
 global.fetch=async(url)=>ok(String(url).endsWith('/workspace')?{items:[
  {...item,cancelled:true,status:'FINALIZED'}, {...item,id:'44444444-4444-4444-8444-444444444444',cancelled:false,status:'FINALIZED'}
 ]}:detail);
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<6;i++){await next();view.render();}
 const options=(x,p,out=[])=>{if(!x||typeof x!=='object')return out;
  if(Array.isArray(x)){x.forEach(v=>options(v,p,out));return out;}
  if(p(x))out.push(x);options(x.props?.children,p,out);return out;};
 const count=()=>options(view.tree,n=>n.type==='button'&&
  typeof n.props.className==='string'&&n.props.className.includes('rf-contract-workspace-item')).length;
 const status=options(view.tree,n=>n.type==='select'&&n.props.value==='ALL')[0];
 status.props.onChange({target:{value:'CANCELLED'}});view.render();
 assert.equal(count(),1);
 status.props.onChange({target:{value:'FINALIZED'}});view.render();
 assert.equal(count(),1);
});
