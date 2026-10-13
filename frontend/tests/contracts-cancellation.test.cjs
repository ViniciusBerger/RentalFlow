const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_WORKSPACE_ENABLED='true';
process.env.VITE_CONTRACT_CANCELLATIONS_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {ContractsWorkspacePage}=require('../src/features/contracts/workspace.tsx');
const {prepareContractCancellation,confirmContractCancellation}=require('../src/features/contracts/contract-workspace-api.ts');
const {rentalDataStore}=require('../src/hooks/load-data/rental-data-store.ts');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const {LanguageContext}=require('../src/i18n/context.ts');
const initialLanguage=LanguageContext._currentValue;
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
 rentalDataStore.refreshAfterMutation=originalRefresh;LanguageContext._currentValue=initialLanguage;clearCsrfToken();
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

const review={ready:true,reviewToken:'b'.repeat(64),contractId:id,
 revisionId:item.revisionId,revisionStatus:'FINALIZED',startDate:'2027-04-01',endDate:'2027-04-03',
 revenueExcludedCents:40000,profitExcludedCents:30000,recordedReceivedCents:0,refundIssued:false};
async function showReview(fetcher){
 global.fetch=fetcher;
 const ui=mount(ContractsWorkspacePage);
 for(let i=0;i<5;i++){await next();ui.render();}
 const b=find(ui.tree,n=>n.type==='button'&&text(n)==='Review cancellation');
 assert.ok(b);
 b.props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 return ui;
}
test('user declining final browser confirmation makes no cancellation mutation',async()=>{
 let posts=0;
 global.window={confirm:()=>false};
 const ui=await showReview(async(url)=>{
  if(String(url).endsWith('/cancellation-review'))return {ok:true,json:async()=>review};
  if(String(url).endsWith('/workspace'))return {ok:true,json:async()=>({items:[item]})};
  if(String(url).endsWith('/cancel')){posts++;return {ok:true,json:async()=>({})}};
  return {ok:true,json:async()=>detail};
 });
 const confirm=find(ui.tree,n=>n.type==='button'&&text(n)==='Confirm cancellation');
 assert.ok(confirm);confirm.props.onClick();
 for(let i=0;i<3;i++){await next();ui.render();}
 assert.equal(posts,0);
 assert.ok(find(ui.tree,n=>n.type==='button'&&text(n)==='Confirm cancellation'));
});
test('server cancellation conflict never shows success or refreshes financial store',async()=>{
 let refreshed=0,posts=0;
 rentalDataStore.refreshAfterMutation=async()=>{refreshed++};
 global.window={confirm:()=>true};
 const ui=await showReview(async(url)=>{
  if(String(url).endsWith('/auth/csrf'))return {ok:true,json:async()=>({csrfToken:'csrf'})};
  if(String(url).endsWith('/cancellation-review'))return {ok:true,json:async()=>review};
  if(String(url).endsWith('/cancel')){posts++;return {ok:false,status:409,json:async()=>({message:'Stale review'})}};
  if(String(url).endsWith('/workspace'))return {ok:true,json:async()=>({items:[item]})};
  return {ok:true,json:async()=>detail};
 });
 const confirm=find(ui.tree,n=>n.type==='button'&&text(n)==='Confirm cancellation');
 confirm.props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.equal(posts,1);assert.equal(refreshed,0);
 assert.match(JSON.stringify(ui.tree),/Stale review/);
 assert.equal(find(ui.tree,n=>n.type==='button'&&text(n)==='Confirm cancellation'),null);
});
test('cancelled contracts remain available to inspect and filter, but cannot be cancelled again',async()=>{
 global.fetch=async(url)=>{
  if(String(url).endsWith('/workspace'))return {ok:true,json:async()=>({items:[{...item,cancelled:true}]})};
  return {ok:true,json:async()=>({...detail,cancelled:true})};
 };
 const ui=mount(ContractsWorkspacePage);
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.match(JSON.stringify(ui.tree),/Booking cancelled/);
 assert.equal(find(ui.tree,n=>n.type==='button'&&text(n)==='Review cancellation'),null);
 const select=find(ui.tree,n=>n.type==='select'&&n.props.value==='ALL');
 assert.ok(select);
 select.props.onChange({target:{value:'CANCELLED'}});ui.render();
 assert.match(JSON.stringify(ui.tree),/CANCELLED/);
});
test('Portuguese cancellation review states the financial effect without claiming a refund',async()=>{
 LanguageContext._currentValue={locale:'pt-BR',setLocale:()=>{},t:()=>''};
 global.window={confirm:()=>false};
 global.fetch=async(url)=>{
  if(String(url).endsWith('/cancellation-review'))return {ok:true,json:async()=>({...review,recordedReceivedCents:5000})};
  if(String(url).endsWith('/workspace'))return {ok:true,json:async()=>({items:[item]})};
  return {ok:true,json:async()=>detail};
 };
 const ui=mount(ContractsWorkspacePage);
 for(let i=0;i<5;i++){await next();ui.render();}
 const action=find(ui.tree,n=>n.type==='button'&&text(n)==='Revisar cancelamento');
 assert.ok(action);action.props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 const value=JSON.stringify(ui.tree);
 assert.match(value,/Nenhum reembolso/);
 assert.match(value,/Pagamentos registrados/);
 assert.ok(find(ui.tree,n=>n.type==='button'&&text(n)==='Confirmar cancelamento'));
});

test('read-only cancellation review responds to server errors without exposing private details',async()=>{
 const seen=[];
 global.fetch=async(url,opts)=>{
  seen.push([String(url),opts]);
  return {ok:false,status:403,json:async()=>({message:'Not your contract'})};
 };
 await assert.rejects(prepareContractCancellation(id),/Not your contract/);
 assert.equal(seen[0][1].credentials,'include');
 assert.equal(seen[0][1].cache,'no-store');
 assert.equal(seen.length,1);
});
test('cancellation API rejects missing/non-JSON error messages and never implies a refund',async()=>{
 let called=0;
 global.fetch=async(url)=>{
  called++;
  if(String(url).endsWith('/auth/csrf'))return {ok:true,json:async()=>({csrfToken:'session-bound-csrf'})};
  return {ok:false,status:409,json:async()=>{throw Error('Broken JSON')}};
 };
 await assert.rejects(confirmContractCancellation(id,'c'.repeat(64)),/HTTP 409/);
 assert.equal(called,2);
});
test('cancellation review fallback HTTP error is safe even with no message field',async()=>{
 global.fetch=async()=>({ok:false,status:503,json:async()=>({something:'else'})});
 await assert.rejects(prepareContractCancellation(id),/HTTP 503/);
});
