const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_API_URL='http://localhost:3000';
process.env.VITE_CONTRACT_WORKSPACE_ENABLED='true';
process.env.VITE_CONTRACT_CHANGES_ENABLED='true';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {ContractsWorkspacePage}=require('../src/features/contracts/workspace.tsx');
const {getCancellationPreview}=require('../src/features/contracts/contract-workspace-api.ts');
const id='33333333-3333-4333-8333-333333333333';
const rental='22222222-2222-4222-8222-222222222222';
const original=global.fetch;
const sleep=()=>new Promise(resolve=>setImmediate(resolve));
const ok=data=>({ok:true,json:async()=>data});
const item={id,rentalId:rental,propertyId:'11111111-1111-4111-8111-111111111111',propertyName:'Casa',
 firstName:'Ana',lastName:'Silva',startDate:'2027-01-01',endDate:'2027-01-02',guests:2,revenue:200,
 status:'FINALIZED',revisionId:'44444444-4444-4444-8444-444444444444',revisionVersion:1};
const detail={id,status:'FINALIZED',revisionId:item.revisionId,revisionVersion:1,
 booking:{clientFirstName:'Ana',clientLastName:'Silva',startDate:item.startDate,endDate:item.endDate,guests:2,totalCents:20000},
 property:{id:item.propertyId,name:'Casa'},editable:false,preview:{ready:true,missing:[],clauses:[]},
 guest:{},installments:[{sequence:1,agreedCents:20000,isDeposit:false}],pricing:{},history:[],editToken:'a'.repeat(64)};
const quote={contractId:id,bookingId:rental,revisionId:item.revisionId,
 paidCents:10000,refundDueCents:null,retainedCents:null,deadlineMet:false,
 automaticTransferAvailable:false,refundState:'POLICY_REVIEW_REQUIRED',
 requiresLandlordConfirmation:true,refundExecutionStatus:'NOT_AVAILABLE',cancellationStatus:'PREVIEW_ONLY'};
function find(node,fn){
 if(!node||typeof node!=='object')return null;
 if(Array.isArray(node))return node.map(x=>find(x,fn)).find(Boolean)||null;
 if(fn(node))return node;
 return find(node.props?.children,fn);
}
async function loaded(){
 const ui=mount(ContractsWorkspacePage);
 for(let i=0;i<6;i++){await sleep();ui.render();}
 return ui;
}
afterEach(()=>{global.fetch=original});
test('contract cancel preview fetch is session scoped, read only, and never sends refund details',async()=>{
 let args;
 global.fetch=async (...x)=>{args=x;return ok(quote)};
 assert.equal((await getCancellationPreview(id)).refundState,'POLICY_REVIEW_REQUIRED');
 assert.match(args[0],/cancellation-preview$/);
 assert.equal(args[1].credentials,'include');
 assert.equal(args[1].cache,'no-store');
 assert.equal(args[1].method,undefined);
});
test('workspace displays policy-review requirement without cancel/refund success action',async()=>{
 const urls=[];
 global.fetch=async url=>{
  urls.push(String(url));
  if(String(url).endsWith('/cancellation-preview'))return ok(quote);
  return ok(String(url).endsWith('/workspace')?{items:[item]}:detail);
 };
 const ui=await loaded();
 const button=find(ui.tree,x=>x.type==='button'&&x.props.children?.toString?.().includes('Calculate cancellation'));
 assert.ok(button,'Expected read-only cancellation preview button');
 await button.props.onClick();
 await sleep();ui.render();
 assert.ok(urls.some(x=>x.endsWith('/cancellation-preview')));
 assert.match(JSON.stringify(ui.tree),/Policy review required/);
 assert.match(JSON.stringify(ui.tree),/Automatic transfer unavailable/);
 assert.doesNotMatch(JSON.stringify(ui.tree),/Refund completed/);
});
test('paid cancellation preview displays server-provided amount and no transfer promise',async()=>{
 global.fetch=async url=>{
  if(String(url).endsWith('/cancellation-preview'))return ok({...quote,refundDueCents:10000,refundState:'FULL_REFUND_DUE'});
  return ok(String(url).endsWith('/workspace')?{items:[item]}:detail);
 };
 const ui=await loaded();
 const button=find(ui.tree,x=>x.type==='button'&&x.props.children?.toString?.().includes('Calculate cancellation'));
 assert.ok(button);
 await button.props.onClick();await sleep();ui.render();
 assert.match(JSON.stringify(ui.tree),/100/);
 assert.match(JSON.stringify(ui.tree),/Automatic transfer unavailable/);
});
test('preview endpoint failure displays error, not fictitious refund approval',async()=>{
 global.fetch=async url=>{
  if(String(url).endsWith('/cancellation-preview'))
   return {ok:false,status:409,json:async()=>({message:'Payment ledger is inconsistent'})};
  return ok(String(url).endsWith('/workspace')?{items:[item]}:detail);
 };
 const ui=await loaded();
 const button=find(ui.tree,x=>x.type==='button'&&x.props.children?.toString?.().includes('Calculate cancellation'));
 assert.ok(button);
 await button.props.onClick();await sleep();ui.render();
 assert.match(JSON.stringify(ui.tree),/Payment ledger is inconsistent/);
});
