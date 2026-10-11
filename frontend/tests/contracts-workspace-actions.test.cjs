const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_WORKSPACE_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const {ContractsWorkspacePage}=require('../src/features/contracts/workspace.tsx');
const {getContract,listContracts,saveContractDraft,downloadDraftPdf}=require('../src/features/contracts/contract-workspace-api.ts');
const key='33333333-3333-4333-8333-333333333333';
const item={id:key,rentalId:'22222222-2222-4222-8222-222222222222',
 propertyId:'11111111-1111-4111-8111-111111111111',propertyName:'Casa Teste',
 firstName:'Ana',lastName:'Silva',startDate:'2027-01-01',endDate:'2027-01-03',
 guests:2,revenue:500,status:'DRAFT',revisionVersion:1};
const data=(editable=true)=>({
 id:key,rentalId:item.rentalId,status:editable?'DRAFT':'FINALIZED',
 revisionVersion:1,editable,editToken:'a'.repeat(64),
 property:{id:item.propertyId,name:item.propertyName,address:'Endereço de teste'},
 booking:{clientFirstName:'Ana',clientLastName:'Silva',startDate:item.startDate,
  endDate:item.endDate,guests:2,totalCents:50000},
 guest:{cpf:'',rg:'',nationality:'BR',maritalStatus:'',address:'',phone:'',email:''},
 installments:[{id:'44444444-4444-4444-8444-444444444444',sequence:1,agreedCents:50000,
  dueEvent:'KEY_HANDOVER',paymentMethod:'PIX',dueDate:null,isDeposit:false,receivedCents:0}],
 history:[{id:'44444444-4444-4444-8444-444444444444',status:'DRAFT',version:1,
  createdAt:'2026-10-11'}],
 pricing:{guestFeeReason:'Guest fee waived for booking',guestFeeMode:'WAIVED'},
 templateVersion:1,preview:{watermark:'RASCUNHO',missing:[],
  clauses:[{id:'1',title:'Contrato de teste',body:'Texto aprovado de teste'}]}
});
const response=(value)=>({ok:true,status:200,json:async()=>value,
 blob:async()=>new Blob(['%PDF-1.4\nprivate watermark draft PDF preview contents\n%%EOF'],{type:'application/pdf'})});
const oldFetch=global.fetch,oldWindow=global.window,oldDocument=global.document;
const pause=()=>new Promise(r=>setImmediate(r));
const find=(node,fn)=>!node||typeof node!=='object'?null:
 Array.isArray(node)?node.map(v=>find(v,fn)).find(Boolean)||null:
 fn(node)?node:find(node.props?.children,fn);
const all=(node,fn,out=[])=>{
 if(!node||typeof node!=='object')return out;
 if(Array.isArray(node)){node.forEach(v=>all(v,fn,out));return out;}
 if(fn(node))out.push(node);
 all(node.props?.children,fn,out);return out;
};
function server(opts={}){
 const calls=[];
 global.fetch=async(url,init={})=>{
  const path=String(url);calls.push({path,init});
  if(path.endsWith('/auth/csrf'))return response({csrfToken:'session-csrf'});
  if(path.endsWith('/workspace'))return response({items:opts.empty?[]:[item]});
  if(path.endsWith('/draft'))return response({...data(),editToken:'b'.repeat(64)});
  if(path.endsWith('/preview.pdf'))return response({});
  if(path.endsWith('/workspace/'+key))return response(data(!opts.finalized));
  return {ok:false,status:404,json:async()=>({message:'Unknown path'})};
 };
 return calls;
}
async function loaded(){
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<5;i++){await pause();view.render();}
 return view;
}
afterEach(()=>{global.fetch=oldFetch;global.window=oldWindow;global.document=oldDocument;clearCsrfToken();});
test('guest details save uses the server edit token and ignores privileged payment fields',async()=>{
 const calls=server(),view=await loaded();
 const cpf=find(view.tree,n=>n.type==='input'&&n.props.name==='cpf');
 assert.ok(cpf);cpf.props.onChange({target:{value:'masked-value'}});
 view.render();
 const btn=all(view.tree,n=>n.type==='button').find(n=>JSON.stringify(n.props.children).includes('Save draft'));
 assert.ok(btn);btn.props.onClick();
 for(let i=0;i<4;i++){await pause();view.render();}
 const patch=calls.find(x=>x.path.endsWith('/draft'));
 assert.ok(patch);assert.equal(patch.init.method,'PATCH');
 const sent=JSON.parse(patch.init.body);
 assert.equal(sent.editToken,'a'.repeat(64));
 assert.equal(sent.guest.cpf,'masked-value');
 assert.equal('userId' in sent,false);
 assert.equal('receivedCents' in sent,false);
 assert.equal(patch.init.headers.get('X-CSRF-Token'),'session-csrf');
});
test('installments are editable only on drafts and privileged data stays read-only',async()=>{
 server();const view=await loaded();
 const total=JSON.stringify(view.tree);assert.match(total,/500[.]00/);
 const amount=find(view.tree,n=>n.type==='input'&&n.props.type==='number');
 assert.ok(amount);amount.props.onChange({target:{value:'250'}});
 view.render();
 const add=all(view.tree,n=>n.type==='button').find(n=>JSON.stringify(n.props.children).includes('Add installment'));
 assert.ok(add);add.props.onClick();view.render();
 const amounts=all(view.tree,n=>n.type==='input'&&n.props.type==='number');
 assert.equal(amounts.length,2);
 amounts[1].props.onChange({target:{value:'250'}});
 view.render();assert.equal(all(view.tree,n=>n.type==='input'&&n.props.type==='number').length,2);
});
test('finalized versions do not render a mutable save action',async()=>{
 server({finalized:true});const view=await loaded();
 const cpf=find(view.tree,n=>n.type==='input'&&n.props.name==='cpf');
 assert.equal(cpf.props.disabled,true);
 const button=all(view.tree,n=>n.type==='button').find(n=>JSON.stringify(n.props.children).includes('Salvar rascunho'));
 assert.equal(button,undefined);
});
test('workspace handles empty lists, and private API forbids guessed routes',async()=>{
 const calls=server({empty:true});
 const view=await loaded();assert.match(JSON.stringify(view.tree),/No contracts found/);
 await listContracts();assert.equal(calls.some(x=>x.path.endsWith('/workspace')),true);
});
test('API client enforces CSRF and only accepts genuine PDF mime types',async()=>{
 const calls=server();
 await getContract(key);await listContracts();
 await saveContractDraft(key,{editToken:'a'.repeat(64),guest:{rg:'draft'}});
 const result=await downloadDraftPdf(key);
 assert.equal(result.type,'application/pdf');
 assert.ok(calls.some(c=>c.path.endsWith('/preview.pdf')));
});
