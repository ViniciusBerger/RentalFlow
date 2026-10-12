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
