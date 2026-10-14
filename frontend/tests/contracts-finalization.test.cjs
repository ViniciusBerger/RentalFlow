const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_WORKSPACE_ENABLED='true';
process.env.VITE_CONTRACT_FINALIZATION_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const {ContractsWorkspacePage}=require('../src/features/contracts/workspace.tsx');
const {prepareContractFinalization,finalizeContract,downloadFinalContractPdf,contractFinalizationEnabled}=
 require('../src/features/contracts/contract-workspace-api.ts');
const key='33333333-3333-4333-8333-333333333333';
const rev='44444444-4444-4444-8444-444444444444';
const token='a'.repeat(64);
const oldFetch=global.fetch,oldWindow=global.window,oldDocument=global.document;
const pause=()=>new Promise(r=>setImmediate(r));
const ok=value=>({ok:true,status:200,json:async()=>value,
 blob:async()=>new Blob(['%PDF-1.7\n'+'.'.repeat(120)],{type:'application/pdf'})});
const find=(node,fn)=>!node||typeof node!=='object'?[]:Array.isArray(node)?
 node.flatMap(x=>find(x,fn)):[...(fn(node)?[node]:[]),...find(node.props?.children,fn)];
const button=(tree,words)=>find(tree,x=>x.type==='button').find(x=>JSON.stringify(x.props.children).includes(words));
const list={items:[{id:key,propertyId:'11111111-1111-4111-8111-111111111111',
 propertyName:'Casa Azul',firstName:'Ana',lastName:'Teste',startDate:'2027-01-01',
 endDate:'2027-01-02',revenue:300,status:'DRAFT',revisionVersion:1}]};
function detail(status='DRAFT'){
 return {id:key,revisionId:rev,status,revisionVersion:1,editable:status==='DRAFT',
  booking:{clientFirstName:'Ana',clientLastName:'Teste',startDate:'2027-01-01',
   endDate:'2027-01-02',totalCents:30000},property:{name:'Casa Azul'},
  guest:{},installments:[],history:[],pricing:{},editToken:'b'.repeat(64),
  preview:{ready:true,missing:[],clauses:[{id:'1',title:'Approved',body:'Approved clause'}]}};
}
afterEach(()=>{global.fetch=oldFetch;global.window=oldWindow;global.document=oldDocument;clearCsrfToken();});

test('private finalization API uses session, CSRF, and review token only',async()=>{
 assert.equal(contractFinalizationEnabled,true);
 const calls=[];
 global.fetch=async(url,init={})=>{
  calls.push({url:String(url),init});
  if(String(url).endsWith('/auth/csrf'))return ok({csrfToken:'secure-csrf'});
  if(String(url).endsWith('/finalization-review'))return ok({ready:true,reviewToken:token,revisionId:rev,version:1});
  if(String(url).endsWith('/finalize'))return ok({status:'FINALIZED',revisionId:rev,signatureStatus:'UNSIGNED'});
  return ok({});
 };
 const review=await prepareContractFinalization(key);
 assert.equal(review.reviewToken,token);
 const finalized=await finalizeContract(key,token);
 assert.equal(finalized.signatureStatus,'UNSIGNED');
 const write=calls.find(c=>c.url.endsWith('/finalize'));
 assert.equal(write.init.method,'POST');
 assert.equal(write.init.headers.get('X-CSRF-Token'),'secure-csrf');
 assert.deepEqual(JSON.parse(write.init.body),{reviewToken:token,confirm:true});
 assert.equal(write.init.credentials,'include');
 assert.equal(calls.some(c=>c.url.endsWith('/finalization-review')&&c.init.cache==='no-store'),true);
});

test('archived PDF is retrieved privately from its finalized revision only',async()=>{
 const calls=[];
 global.fetch=async(url,init={})=>{calls.push({url:String(url),init});return ok({});};
 const blob=await downloadFinalContractPdf(key,rev);
 assert.equal(blob.type,'application/pdf');
 assert.ok(blob.size>100);
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/\/contracts\/.*\/revisions\/.*\/pdf$/);
 assert.equal(calls[0].init.credentials,'include');
 global.fetch=async()=>({ok:true,blob:async()=>new Blob(['HTML'],{type:'text/html'})});
 await assert.rejects(downloadFinalContractPdf(key,rev),/Invalid finalized PDF/);
});

test('workspace prepares, confirms and archives a saved draft without browser authority over booking values',async()=>{
 const calls=[];let finalized=false;
 global.window={confirm:()=>true,setTimeout:()=>1};
 global.fetch=async(url,init={})=>{
  const path=String(url);calls.push({path,init});
  if(path.endsWith('/auth/csrf'))return ok({csrfToken:'secure-csrf'});
  if(path.endsWith('/finalization-review'))return ok({ready:true,reviewToken:token,revisionId:rev,version:1});
  if(path.endsWith('/finalize')){finalized=true;return ok({status:'FINALIZED',revisionId:rev,signatureStatus:'UNSIGNED'});}
  if(path.endsWith('/workspace'))return ok(list);
  if(path.endsWith('/workspace/'+key))return ok(detail(finalized?'FINALIZED':'DRAFT'));
  return {ok:false,status:404,json:async()=>({message:'Not found'})};
 };
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<7;i++){await pause();view.render();}
 const review=button(view.tree,'Validate for finalization');
 assert.ok(review);assert.equal(review.props.disabled,false);
 review.props.onClick();
 for(let i=0;i<6;i++){await pause();view.render();}
 const approve=button(view.tree,'Confirm unsigned finalization');
 assert.ok(approve);approve.props.onClick();
 for(let i=0;i<10;i++){await pause();view.render();}
 assert.equal(finalized,true);
 assert.ok(calls.some(c=>c.path.endsWith('/finalization-review')));
 const request=calls.find(c=>c.path.endsWith('/finalize'));
 assert.equal(request.init.method,'POST');
 assert.deepEqual(Object.keys(JSON.parse(request.init.body)).sort(),['confirm','reviewToken']);
 assert.ok(button(view.tree,'Download archived PDF'));
 assert.equal(button(view.tree,'Save draft'),undefined);
});

test('finalization fails closed on denied review and stale confirmation',async()=>{
 const situations=[['review',()=>prepareContractFinalization(key),'Incomplete property'],
  ['finalize',()=>finalizeContract(key,token),'Contract changed'],
  ['pdf',()=>downloadFinalContractPdf(key,rev),'Contract not found']];
 for(const [phase,action,message] of situations){
  clearCsrfToken();
  global.fetch=async(url)=>{
   if(String(url).endsWith('/auth/csrf'))return ok({csrfToken:'secure-csrf'});
   return {ok:false,status:409,json:async()=>({message})};
  };
  await assert.rejects(action(),new RegExp(message));
 }
});

test('invalid server responses are rejected without inventing finalization or a valid PDF',async()=>{
 global.fetch=async()=>({ok:false,status:503,json:async()=>null});
 await assert.rejects(prepareContractFinalization(key),/HTTP 503/);
 global.fetch=async()=>({ok:true,blob:async()=>new Blob(['%PDF-1'],{type:'application/pdf'})});
 await assert.rejects(downloadFinalContractPdf(key,rev),/Invalid finalized PDF/);
});

test('declined browser confirmation cannot issue a finalization write',async()=>{
 const calls=[];
 global.window={confirm:()=>false,setTimeout:()=>1};
 global.fetch=async(url)=>{
  const path=String(url);calls.push(path);
  if(path.endsWith('/workspace'))return ok(list);
  if(path.endsWith('/finalization-review'))return ok({ready:true,reviewToken:token,revisionId:rev,version:1});
  if(path.endsWith('/workspace/'+key))return ok(detail('DRAFT'));
  return ok({});
 };
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<7;i++){await pause();view.render();}
 const review=button(view.tree,'Validate for finalization');
 assert.ok(review);review.props.onClick();
 for(let i=0;i<6;i++){await pause();view.render();}
 const approve=button(view.tree,'Confirm unsigned finalization');
 assert.ok(approve);approve.props.onClick();
 for(let i=0;i<4;i++){await pause();view.render();}
 assert.equal(calls.some(x=>x.endsWith('/finalize')),false);
});

test('API rejects malformed failures without trusting client-visible approval status',async()=>{
 const denied=[
  {status:412,json:async()=>({reason:'precondition'})},
  {status:418,json:async()=>('unexpected')},
  {status:429,json:async()=>{throw new Error('invalid JSON');}}
 ];
 for(const item of denied){
  global.fetch=async()=>({ok:false,...item});
  await assert.rejects(prepareContractFinalization(key),new RegExp('HTTP '+item.status));
 }
});

test('the archived document rejects large non-PDF responses and refused file access',async()=>{
 global.fetch=async()=>({ok:true,blob:async()=>new Blob(['not a PDF'.repeat(100)],{type:'text/plain'})});
 await assert.rejects(downloadFinalContractPdf(key,rev),/Invalid finalized PDF/);
 global.fetch=async()=>({ok:false,status:403,json:async()=>({message:'No access'})});
 await assert.rejects(downloadFinalContractPdf(key,rev),/No access/);
});

test('failed server review displays error and cannot expose finalization confirmation',async()=>{
 global.fetch=async(url)=>{
  const path=String(url);
  if(path.endsWith('/workspace'))return ok(list);
  if(path.endsWith('/workspace/'+key))return ok(detail('DRAFT'));
  if(path.endsWith('/finalization-review'))
   return {ok:false,status:409,json:async()=>({message:'Missing landlord identity'})};
  return ok({});
 };
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<7;i++){await pause();view.render();}
 const review=button(view.tree,'Validate for finalization');
 assert.ok(review);review.props.onClick();
 for(let i=0;i<7;i++){await pause();view.render();}
 assert.equal(button(view.tree,'Confirm unsigned finalization'),undefined);
 assert.match(JSON.stringify(view.tree),/Missing landlord identity/);
});

test('stale finalization token invalidates confirm action and surfaces server rejection',async()=>{
 global.window={confirm:()=>true};
 global.fetch=async(url)=>{
  const path=String(url);
  if(path.endsWith('/workspace'))return ok(list);
  if(path.endsWith('/workspace/'+key))return ok(detail('DRAFT'));
  if(path.endsWith('/finalization-review'))return ok({ready:true,reviewToken:token,revisionId:rev,version:1});
  if(path.endsWith('/auth/csrf'))return ok({csrfToken:'session-csrf'});
  if(path.endsWith('/finalize'))return {ok:false,status:409,json:async()=>({message:'Contract changed'})};
  return ok({});
 };
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<7;i++){await pause();view.render();}
 button(view.tree,'Validate for finalization').props.onClick();
 for(let i=0;i<6;i++){await pause();view.render();}
 button(view.tree,'Confirm unsigned finalization').props.onClick();
 for(let i=0;i<8;i++){await pause();view.render();}
 assert.equal(button(view.tree,'Confirm unsigned finalization'),undefined);
 assert.match(JSON.stringify(view.tree),/Contract changed/);
});

test('archive download stays private and does not return the draft PDF',async()=>{
 const events=[];
 global.window={setTimeout:()=>1};
 global.document={createElement:()=>({click:()=>events.push('click'),remove:()=>events.push('remove')}),
  body:{appendChild:()=>events.push('append')}};
 global.fetch=async(url,init={})=>{
  const path=String(url);events.push(path);
  if(path.endsWith('/workspace'))return ok(list);
  if(path.endsWith('/workspace/'+key))return ok(detail('FINALIZED'));
  if(path.endsWith('/revisions/'+rev+'/pdf'))return ok({});
  return ok({});
 };
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<7;i++){await pause();view.render();}
 const pdf=button(view.tree,'Download archived PDF');
 assert.ok(pdf);pdf.props.onClick();
 for(let i=0;i<7;i++){await pause();view.render();}
 assert.ok(events.some(x=>x.endsWith('/revisions/'+rev+'/pdf')));
 assert.ok(events.includes('click'));
 assert.equal(events.some(x=>x.endsWith('/preview.pdf')),false);
});

test('Portuguese finalization follows verified review and displays unsigned archive copy',async()=>{
 const {LanguageContext}=require('../src/i18n/context.ts');
 const {translate}=require('../src/i18n/messages.ts');
 const originalLocale=LanguageContext._currentValue;
 LanguageContext._currentValue={locale:'pt-BR',setLocale:()=>{},t:key=>translate('pt-BR',key)};
 let finalized=false;
 try{
  global.window={confirm:()=>true,setTimeout:()=>1};
  global.fetch=async(url)=>{
   const path=String(url);
   if(path.endsWith('/workspace'))return ok(list);
   if(path.endsWith('/workspace/'+key))return ok(detail(finalized?'FINALIZED':'DRAFT'));
   if(path.endsWith('/finalization-review'))return ok({ready:true,reviewToken:token,revisionId:rev,version:1});
   if(path.endsWith('/auth/csrf'))return ok({csrfToken:'verified'});
   if(path.endsWith('/finalize')){finalized=true;return ok({status:'FINALIZED',revisionId:rev,signatureStatus:'UNSIGNED'});}
   return ok({});
  };
  const view=mount(ContractsWorkspacePage);
  for(let i=0;i<7;i++){await pause();view.render();}
  const review=button(view.tree,'Validar para finalização');
  assert.ok(review);review.props.onClick();
  for(let i=0;i<6;i++){await pause();view.render();}
  assert.match(JSON.stringify(view.tree),/Validações concluídas/);
  const approve=button(view.tree,'Confirmar finalização sem assinatura');
  assert.ok(approve);approve.props.onClick();
  for(let i=0;i<9;i++){await pause();view.render();}
  assert.equal(finalized,true);
  assert.ok(button(view.tree,'Baixar PDF arquivado'));
  assert.match(JSON.stringify(view.tree),/não assinado/);
 }finally{LanguageContext._currentValue=originalLocale;}
});

test('refused archived PDF never shows a draft file or conceals the permission error',async()=>{
 global.fetch=async(url)=>{
  const path=String(url);
  if(path.endsWith('/workspace'))return ok(list);
  if(path.endsWith('/workspace/'+key))return ok(detail('FINALIZED'));
  if(path.endsWith('/revisions/'+rev+'/pdf'))
   return {ok:false,status:403,json:async()=>({message:'Archive access denied'})};
  return ok({});
 };
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<7;i++){await pause();view.render();}
 const btn=button(view.tree,'Download archived PDF');
 assert.ok(btn);btn.props.onClick();
 for(let i=0;i<7;i++){await pause();view.render();}
 assert.match(JSON.stringify(view.tree),/Archive access denied/);
 assert.equal(button(view.tree,'Download preview'),undefined);
});

test('new unsaved guest identity invalidates any earlier successful finalization review',async()=>{
 global.fetch=async(url)=>{
  const path=String(url);
  if(path.endsWith('/workspace'))return ok(list);
  if(path.endsWith('/workspace/'+key))return ok(detail('DRAFT'));
  if(path.endsWith('/finalization-review'))return ok({ready:true,reviewToken:token,revisionId:rev,version:1});
  return ok({});
 };
 const view=mount(ContractsWorkspacePage);
 for(let i=0;i<7;i++){await pause();view.render();}
 button(view.tree,'Validate for finalization').props.onClick();
 for(let i=0;i<6;i++){await pause();view.render();}
 assert.ok(button(view.tree,'Confirm unsigned finalization'));
 const cpf=find(view.tree,x=>x.type==='input'&&x.props.name==='cpf')[0];
 assert.ok(cpf);cpf.props.onChange({target:{value:'52998224725'}});
 view.render();
 assert.equal(button(view.tree,'Confirm unsigned finalization'),undefined);
 assert.equal(button(view.tree,'Validate for finalization').props.disabled,true);
});

test('archived PDF refuses server denial and corrupt or short content',async()=>{
 const success=(body,type)=>({ok:true,status:200,blob:async()=>new Blob([body],{type})});
 const id=key;
 global.fetch=async()=>({ok:false,status:404,json:async()=>({message:'Not your archived contract'})});
 await assert.rejects(downloadFinalContractPdf(id,rev),/Not your archived contract/);
 global.fetch=async()=>success('Not PDF data','text/plain');
 await assert.rejects(downloadFinalContractPdf(id,rev),/Invalid finalized PDF/);
 global.fetch=async()=>success('%PDF-too-short','application/pdf');
 await assert.rejects(downloadFinalContractPdf(id,rev),/Invalid finalized PDF/);
});
test('private PDF error fallback and valid long file require correct MIME',async()=>{
 global.fetch=async()=>({ok:false,status:503,json:async()=>{throw Error('invalid json')}});
 await assert.rejects(downloadFinalContractPdf(key,rev),/HTTP 503/);
 global.fetch=async()=>({ok:true,status:200,
  blob:async()=>new Blob(['%PDF-1.7\n'+'.'.repeat(220)],{type:'application/pdf'})});
 const blob=await downloadFinalContractPdf(key,rev);
 assert.ok(blob.size>100);
 assert.equal(blob.type,'application/pdf');
});
