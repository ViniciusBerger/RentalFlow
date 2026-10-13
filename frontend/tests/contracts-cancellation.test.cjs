const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_WORKSPACE_ENABLED='true';
process.env.VITE_CONTRACT_CANCELLATIONS_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {ContractsWorkspacePage}=require('../src/features/contracts/workspace.tsx');
const {rentalDataStore}=require('../src/hooks/load-data/rental-data-store.ts');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const originalFetch=global.fetch,originalWindow=global.window,originalRefresh=rentalDataStore.refreshAfterMutation;
const next=()=>new Promise(resolve=>setImmediate(resolve));
const id='33333333-3333-4333-8333-333333333333';
const item={id,rentalId:'22222222-2222-4222-8222-222222222222',
 propertyId:'11111111-1111-4111-8111-111111111111',propertyName:'Casa Azul',
 firstName:'Ana',lastName:'Silva',startDate:'2027-04-01',endDate:'2027-04-03',
 guests:2,revenue:400,status:'FINALIZED',revisionId:'44444444-4444-4444-8444-444444444444',
 revisionVersion:1,cancelled:false};
const detail={id,property:{name:'Casa Azul'},booking:{
 clientFirstName:'Ana',clientLastName:'Silva',startDate:'2027-04-01',endDate:'2027-04-03',guests:2,totalCents:40000},
 status:'FINALIZED',revisionVersion:1,revisionId:item.revisionId,history:[],
 guest:{},installments:[{sequence:1,agreedCents:40000,receivedCents:5000,isDeposit:true}],
 editToken:'x'.repeat(64),pricing:{},editable:false,cancelled:false,
 preview:{ready:true,missing:[],clauses:[{id:'1',title:'Approved',body:'Approved original wording'}]}
};
const find=(node,fn)=>!node||typeof node!=='object'?null:Array.isArray(node)?
 node.map(n=>find(n,fn)).find(Boolean)||null:fn(node)?node:find(node.props?.children,fn);
function text(node){return typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):
 node&&typeof node==='object'?text(node.props?.children):''}
afterEach(()=>{
 global.fetch=originalFetch;global.window=originalWindow;
 rentalDataStore.refreshAfterMutation=originalRefresh;clearCsrfToken();
});
test('cancellation requires review and explicit consent, never calls money movement',async()=>{
 let cancelled=false,refreshed=0,confirmCount=0;
 const calls=[];
 global.window={confirm:()=>{confirmCount++;return true;}};
 rentalDataStore.refreshAfterMutation=async()=>{refreshed++};
 global.fetch=async(url,init={})=>{
  const path=String(url);calls.push({path,init});
  if(path.endsWith('/auth/csrf'))return {ok:true,json:async()=>({csrfToken:'csrf-session'})};
  if(path.endsWith('/cancellation-review'))return {ok:true,json:async()=>({
   ready:true,reviewToken:'a'.repeat(64),contractId:id,revisionId:item.revisionId,
   revisionStatus:'FINALIZED',startDate:'2027-04-01',endDate:'2027-04-03',
   revenueExcludedCents:40000,profitExcludedCents:30000,recordedReceivedCents:5000,refundIssued:false
  })};
  if(path.endsWith('/cancel')){cancelled=true;return {ok:true,json:async()=>({cancelled:true,refundIssued:false})};}
  if(path.endsWith('/workspace'))return {ok:true,json:async()=>({items:[{...item,cancelled}]})};
  if(path.endsWith('/workspace/'+id))return {ok:true,json:async()=>({...detail,cancelled})};
  return {ok:false,status:404,json:async()=>({message:'Unexpected URL'})};
 };
 const ui=mount(ContractsWorkspacePage);
 for(let i=0;i<6;i++){await next();ui.render();}
 let button=find(ui.tree,n=>n.type==='button'&&text(n)==='Review cancellation');
 assert.ok(button,'Review action shown for active contract');
 button.props.onClick();
 for(let i=0;i<4;i++){await next();ui.render();}
 assert.equal(cancelled,false);
 assert.match(JSON.stringify(ui.tree),/Recorded receipts/);
 button=find(ui.tree,n=>n.type==='button'&&text(n)==='Confirm cancellation');
 assert.ok(button);
 button.props.onClick();
 for(let i=0;i<7;i++){await next();ui.render();}
 assert.equal(cancelled,true);assert.equal(confirmCount,1);assert.equal(refreshed,1);
 assert.match(JSON.stringify(ui.tree),/Booking cancelled/);
 const mutation=calls.find(x=>x.path.endsWith('/cancel'));
 assert.equal(mutation.init.method,'POST');
 assert.deepEqual(JSON.parse(mutation.init.body),{reviewToken:'a'.repeat(64),confirm:true});
 assert.equal(mutation.init.headers.get('X-CSRF-Token'),'csrf-session');
 assert.equal(calls.filter(x=>x.path.endsWith('/cancel')).length,1);
});
test('review request errors do not cancel bookings or claim success',async()=>{
 global.fetch=async(url)=>String(url).endsWith('/cancellation-review')?
  {ok:false,status:409,json:async()=>({message:'Changed payment'})}:
  {ok:true,json:async()=>String(url).endsWith('/workspace')?{items:[item]}:detail};
 const ui=mount(ContractsWorkspacePage);
 for(let i=0;i<6;i++){await next();ui.render();}
 const button=find(ui.tree,n=>n.type==='button'&&text(n)==='Review cancellation');
 assert.ok(button);button.props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.match(JSON.stringify(ui.tree),/Changed payment/);
 assert.equal(find(ui.tree,n=>n.type==='button'&&text(n)==='Confirm cancellation'),null);
});
