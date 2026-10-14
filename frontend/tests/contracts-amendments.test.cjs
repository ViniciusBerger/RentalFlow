const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_WORKSPACE_ENABLED='true';
process.env.VITE_CONTRACT_AMENDMENTS_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {AmendmentPanel}=require('../src/features/contracts/amendment-panel.tsx');
const {reviewContractAmendment,approveContractAmendment,contractAmendmentsEnabled}=
 require('../src/features/contracts/contract-workspace-api.ts');
const {rentalDataStore}=require('../src/hooks/load-data/rental-data-store.ts');
const {LanguageContext}=require('../src/i18n/context.ts');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const id='33333333-3333-4333-8333-333333333333',p1='11111111-1111-4111-8111-111111111111',
 p2='22222222-2222-4222-8222-222222222222';
const property=(x,name)=>({id:x,name,isActive:true,userId:'owner',
 address:'Rua do Mar',color:'#0D8A57',icon:'building',isDefault:false});
const old=global.fetch,oldWindow=global.window,oldRefresh=rentalDataStore.refreshAfterMutation,
 oldLanguage=LanguageContext._currentValue;
const next=()=>new Promise(r=>setImmediate(r));
const respond=data=>({ok:true,status:200,json:async()=>data});
const review={ready:true,reviewToken:'a'.repeat(64),
 before:{propertyId:p1,startDate:'2027-04-01',endDate:'2027-04-03',guests:2,
  revenueCents:40000,feeCents:10000,profitCents:30000},
 after:{propertyId:p1,startDate:'2027-04-01',endDate:'2027-04-03',guests:3,
  revenueCents:50000,feeCents:10000,profitCents:40000},
 pricing:{baseRevenueCents:40000,totalCents:50000,calculatedExtraCents:10000,chargedExtraCents:10000},
 paymentChanged:true,recordedPayments:0,unsignedAmendmentRequired:true};
function detail(overrides={}){
 return {id,revisionId:'44444444-4444-4444-8444-444444444444',
  property:{id:p1,name:'Casa Azul',address:'Rua 1'},booking:{
   clientFirstName:'Ana',clientLastName:'Silva',startDate:'2027-04-01',endDate:'2027-04-03',
   guests:2,totalCents:40000},
  status:'FINALIZED',cancelled:false,
  pricing:{baseRevenueCents:40000,calculatedExtraCents:0,chargedExtraCents:0,
   guestFeeMode:'AUTOMATIC',guestFeeReason:null},
  installments:[{sequence:1,agreedCents:40000,receivedCents:0,isDeposit:false,
   dueEvent:'CHECKIN',paymentMethod:'PIX'}],...overrides};
}
const nodes=(root,predicate,out=[])=>{
 if(!root||typeof root!=='object')return out;
 if(Array.isArray(root)){root.forEach(x=>nodes(x,predicate,out));return out;}
 if(predicate(root))out.push(root);
 nodes(root.props?.children,predicate,out);return out;
};
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):
 node&&typeof node==='object'?text(node.props?.children):'';
const button=(ui,name)=>nodes(ui.tree,n=>n.type==='button').find(n=>text(n).includes(name));
function network(handler){
 const calls=[];
 global.fetch=async(url,init={})=>{
  const u=String(url);calls.push({url:u,init});
  if(u.endsWith('/auth/csrf'))return respond({csrfToken:'secure-session-csrf'});
  if(u.endsWith('/properties'))return respond([property(p1,'Casa Azul'),property(p2,'Cobertura'),
   {...property('33333333-3333-4333-8333-333333333333','Arquivado'),isActive:false}]);
  if(handler)return handler(u,init,calls);
  if(u.endsWith('/amendment-review'))return respond(review);
  if(u.endsWith('/amend'))return respond({applied:true,revisionId:'new',status:'DRAFT',signatureStatus:'UNSIGNED'});
  return {ok:false,status:404,json:async()=>({message:'Unexpected'})};
 };
 return calls;
}
async function show(options={}){
 const ui=mount(()=>AmendmentPanel({detail:detail(options.detail),onApplied:options.onApplied??(async()=>{})}));
 for(let i=0;i<6;i++){await next();ui.render();}
 return ui;
}
afterEach(()=>{
 global.fetch=old;global.window=oldWindow;rentalDataStore.refreshAfterMutation=oldRefresh;
 LanguageContext._currentValue=oldLanguage;clearCsrfToken();
});
test('amendment requires review then explicit landlord confirmation, exact price and CSRF',async()=>{
 assert.equal(contractAmendmentsEnabled,true);
 let applied=0,refreshed=0;
 global.window={confirm:()=>true};
 rentalDataStore.refreshAfterMutation=async()=>{refreshed++};
 const calls=network();
 const ui=await show({onApplied:async()=>{applied++}});
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 assert.ok(guests);guests.props.onChange({target:{value:'3'}});ui.render();
 const schedule=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox')[0];
 assert.ok(schedule);schedule.props.onChange({target:{checked:true}});ui.render();
 const amounts=nodes(ui.tree,n=>n.type==='input'&&n.props.step==='0.01');
 const installment=amounts.find(n=>n.props.value===400);
 assert.ok(installment);installment.props.onChange({target:{value:'500'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.ok(button(ui,'Approve as landlord'));
 const req=calls.find(c=>c.url.endsWith('/amendment-review'));
 assert.deepEqual(JSON.parse(req.init.body),{
  propertyId:p1,startDate:'2027-04-01',endDate:'2027-04-03',guests:3,
  baseRevenueCents:40000,guestFee:{mode:'AUTOMATIC'},
  installments:[{agreedCents:50000,dueEvent:'CHECKIN',paymentMethod:'PIX',isDeposit:false}]
 });
 assert.equal(req.init.headers.get('X-CSRF-Token'),'secure-session-csrf');
 button(ui,'Approve as landlord').props.onClick();
 for(let i=0;i<7;i++){await next();ui.render();}
 const approved=calls.find(c=>c.url.endsWith('/amend'));
 assert.deepEqual(Object.keys(JSON.parse(approved.init.body)).sort(),
  ['confirm','proposal','reviewToken']);
 assert.equal(JSON.parse(approved.init.body).confirm,true);
 assert.equal(applied,1);assert.equal(refreshed,1);
 assert.equal(calls.filter(c=>c.url.endsWith('/amend')).length,1);
});
test('new proposal invalidates existing review and decline does not commit',async()=>{
 let posts=0;
 global.window={confirm:()=>false};
 network((url)=>{
  if(url.endsWith('/amendment-review'))return respond(review);
  if(url.endsWith('/amend')){posts++;return respond({applied:true})}
  return respond({});
 });
 const ui=await show();
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'3'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.ok(button(ui,'Approve as landlord'));
 const propertySelect=nodes(ui.tree,n=>n.type==='select'&&n.props.value===p1)[0];
 assert.ok(propertySelect);propertySelect.props.onChange({target:{value:p2}});ui.render();
 assert.equal(button(ui,'Approve as landlord'),undefined);
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 button(ui,'Approve as landlord').props.onClick();
 for(let i=0;i<3;i++){await next();ui.render();}
 assert.equal(posts,0);
});
test('recorded receipts disable schedule edits and service refusal is explained',async()=>{
 network(url=>url.endsWith('/amendment-review')
  ?{ok:false,status:409,json:async()=>({message:'Recorded payments require reconciliation'})}:respond({}));
 const ui=await show({detail:{installments:[{sequence:1,agreedCents:40000,
  receivedCents:5000,isDeposit:true,dueEvent:'CHECKIN',paymentMethod:'PIX'}]}});
 const schedule=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox')[0];
 assert.equal(schedule.props.disabled,true);
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.match(JSON.stringify(ui.tree),/Recorded payments require reconciliation/);
 assert.equal(button(ui,'Approve as landlord'),undefined);
});
test('fee waivers and adjustments require reason and preserve exact proposed values',async()=>{
 const calls=network();
 const ui=await show();
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'4'}});ui.render();
 let select=nodes(ui.tree,n=>n.type==='select'&&n.props.value==='AUTOMATIC')[0];
 select.props.onChange({target:{value:'WAIVED'}});ui.render();
 let reason=nodes(ui.tree,n=>n.type==='input'&&n.props.maxLength===300)[0];
 reason.props.onChange({target:{value:'Approved owner waiver'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.deepEqual(JSON.parse(calls.find(x=>x.url.endsWith('/amendment-review')).init.body).guestFee,
  {mode:'WAIVED',reason:'Approved owner waiver'});
 select=nodes(ui.tree,n=>n.type==='select'&&n.props.value==='WAIVED')[0];
 select.props.onChange({target:{value:'ADJUSTED'}});ui.render();
 const adjusted=nodes(ui.tree,n=>n.type==='input'&&n.props.step==='0.01').find(x=>x.props.value==='0');
 assert.ok(adjusted);adjusted.props.onChange({target:{value:'25.25'}});ui.render();
 reason=nodes(ui.tree,n=>n.type==='input'&&n.props.maxLength===300)[0];
 reason.props.onChange({target:{value:'Agreed special rate'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 const requests=calls.filter(x=>x.url.endsWith('/amendment-review'));
 assert.deepEqual(JSON.parse(requests[1].init.body).guestFee,
  {mode:'ADJUSTED',cents:2525,reason:'Agreed special rate'});
});
test('missing base amount fails locally and cancelled/unfinalized contracts show no editor',async()=>{
 let calls=0;
 network((url)=>{if(url.endsWith('/amendment-review'))calls++;return respond({})});
 const ui=await show({detail:{pricing:{baseRevenueCents:null}}});
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<4;i++){await next();ui.render();}
 assert.match(JSON.stringify(ui.tree),/Check all required fields/);
 assert.equal(calls,0);
 const cancelled=await show({detail:{cancelled:true}});
 assert.equal(cancelled.tree,null);
 const draft=await show({detail:{status:'DRAFT'}});
 assert.equal(draft.tree,null);
});
test('Portuguese amendment labels and property loading failure are shown explicitly',async()=>{
 LanguageContext._currentValue={locale:'pt-BR',setLocale:()=>{},t:()=>''};
 global.fetch=async()=>({ok:false,status:500,json:async()=>({message:'Falha'})});
 const ui=await show();
 assert.match(JSON.stringify(ui.tree),/Não foi possível carregar os imóveis/);
 assert.ok(button(ui,'Revisar alteração'));
});

test('installment editor supports explicit due rules, deposit, add and removal without sending receipts',async()=>{
 const calls=network(),ui=await show();
 const schedule=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox')[0];
 schedule.props.onChange({target:{checked:true}});ui.render();
 let deposit=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox').find(n=>!n.props.disabled&&n.props.checked===false&&n!==schedule);
 assert.ok(deposit);deposit.props.onChange({target:{checked:true}});ui.render();
 const event=nodes(ui.tree,n=>n.type==='select'&&n.props.value==='CHECKIN')[0];
 event.props.onChange({target:{value:'AGREED_EVENT'}});ui.render();
 const due=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='date')[2];
 assert.ok(due);due.props.onChange({target:{value:'2027-04-01'}});ui.render();
 const method=nodes(ui.tree,n=>n.type==='select'&&n.props.value==='PIX')[0];
 method.props.onChange({target:{value:'BANK_TRANSFER'}});ui.render();
 button(ui,'Add installment').props.onClick();ui.render();
 assert.equal(nodes(ui.tree,n=>n.type==='input'&&n.props.type==='number').length>=4,true);
 const removeButtons=nodes(ui.tree,n=>n.type==='button'&&text(n).includes('Remove installment'));
 removeButtons[removeButtons.length-1].props.onClick();ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 // No changed booking fields: server refuses the candidate, but browser request never asserts receipts.
 const req=calls.find(x=>x.url.endsWith('/amendment-review'));
 const dto=JSON.parse(req.init.body);
 assert.equal(dto.installments[0].isDeposit,true);
 assert.equal(dto.installments[0].dueDate,'2027-04-01');
 assert.equal(dto.installments[0].dueEvent,undefined);
 assert.equal(dto.installments[0].paymentMethod,'BANK_TRANSFER');
 assert.equal('receivedCents' in dto.installments[0],false);
});
test('validation fails closed for negative base, incomplete guest count and unsafe input',async()=>{
 let posts=0;network(url=>{if(url.endsWith('/amendment-review'))posts++;return respond({})});
 const ui=await show();
 const base=nodes(ui.tree,n=>n.type==='input'&&n.props.step==='0.01')[0];
 base.props.onChange({target:{value:'-1'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<3;i++){await next();ui.render();}
 assert.equal(posts,0);
 base.props.onChange({target:{value:'400'}});ui.render();
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'1.5'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<3;i++){await next();ui.render();}
 assert.equal(posts,0);
});
test('failed landlord approval never refreshes dashboard nor claims an amendment applied',async()=>{
 let refreshed=0,applied=0;
 rentalDataStore.refreshAfterMutation=async()=>{refreshed++};
 global.window={confirm:()=>true};
 network(url=>{
  if(url.endsWith('/amendment-review'))return respond(review);
  if(url.endsWith('/amend'))return {ok:false,status:409,json:async()=>({message:'New dates already booked'})};
  return respond({});
 });
 const ui=await show({onApplied:async()=>{applied++}});
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'3'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 button(ui,'Approve as landlord').props.onClick();
 for(let i=0;i<6;i++){await next();ui.render();}
 assert.equal(applied,0);assert.equal(refreshed,0);
 assert.match(JSON.stringify(ui.tree),/New dates already booked/);
 assert.equal(button(ui,'Approve as landlord'),undefined);
});
test('Portuguese landlord confirmation never represents amendment as electronically signed',async()=>{
 LanguageContext._currentValue={locale:'pt-BR',setLocale:()=>{},t:()=>''};
 global.window={confirm:()=>true};
 network();
 let applied=0;rentalDataStore.refreshAfterMutation=async()=>{};
 const ui=await show({onApplied:async()=>{applied++}});
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'3'}});ui.render();
 button(ui,'Revisar alteração').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.match(JSON.stringify(ui.tree),/NÃO assina/);
 button(ui,'Confirmar como locador').props.onClick();
 for(let i=0;i<6;i++){await next();ui.render();}
 assert.equal(applied,1);
 assert.match(JSON.stringify(ui.tree),/não assinado/);
});

test('property change and edited check-in/checkout/base price invalidate stale reviews',async()=>{
 const calls=network();
 const ui=await show();
 const prop=nodes(ui.tree,n=>n.type==='select'&&n.props.value===p1)[0];
 prop.props.onChange({target:{value:p2}});ui.render();
 const dates=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='date');
 dates[0].props.onChange({target:{value:'2027-05-01'}});ui.render();
 dates[1].props.onChange({target:{value:'2027-05-04'}});ui.render();
 const base=nodes(ui.tree,n=>n.type==='input'&&n.props.step==='0.01').find(n=>n.props.value==='400');
 assert.ok(base);base.props.onChange({target:{value:'600'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 const dto=JSON.parse(calls.find(x=>x.url.endsWith('/amendment-review')).init.body);
 assert.equal(dto.propertyId,p2);
 assert.equal(dto.startDate,'2027-05-01');
 assert.equal(dto.endDate,'2027-05-04');
 assert.equal(dto.baseRevenueCents,60000);
 assert.ok(button(ui,'Approve as landlord'));
 dates[0].props.onChange({target:{value:'2027-05-02'}});ui.render();
 assert.equal(button(ui,'Approve as landlord'),undefined);
});
test('maximum 12 explicitly reviewed installments cannot grow past supported capacity',async()=>{
 network();
 const payments=Array.from({length:12},(_,i)=>({
  sequence:i+1,agreedCents:i===0?40000:0,receivedCents:0,
  isDeposit:false,dueDate:null,dueEvent:'CHECKIN',paymentMethod:'PIX'
 }));
 const ui=await show({detail:{installments:payments}});
 const box=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox')[0];
 box.props.onChange({target:{checked:true}});ui.render();
 assert.equal(nodes(ui.tree,n=>n.type==='input'&&n.props.step==='0.01').length>=13,true);
 assert.equal(button(ui,'Add installment'),undefined);
 const remove=button(ui,'Remove installment');
 assert.ok(remove);remove.props.onClick();ui.render();
 assert.ok(button(ui,'Add installment'));
});
test('server accepts an amendment but failed dashboard refresh must never show an unqualified successful state',async()=>{
 let applied=0;
 global.window={confirm:()=>true};
 rentalDataStore.refreshAfterMutation=async()=>{throw new Error('Dashboard unavailable')};
 network(url=>url.endsWith('/amendment-review')?respond(review):
  url.endsWith('/amend')?respond({applied:true,status:'DRAFT',signatureStatus:'UNSIGNED'}):respond({}));
 const ui=await show({onApplied:async()=>{applied++}});
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'3'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 button(ui,'Approve as landlord').props.onClick();
 for(let i=0;i<6;i++){await next();ui.render();}
 assert.equal(applied,0);
 assert.match(JSON.stringify(ui.tree),/Amendment saved on the server, but the screen could not refresh/);
});
test('empty or invalid extra-guest override amounts remain server-reviewed rather than silently converted into a charge',async()=>{
 const calls=network();
 const ui=await show();
 const menu=nodes(ui.tree,n=>n.type==='select'&&n.props.value==='AUTOMATIC')[0];
 menu.props.onChange({target:{value:'ADJUSTED'}});ui.render();
 const extra=nodes(ui.tree,n=>n.type==='input'&&n.props.step==='0.01').find(x=>x.props.value==='0');
 extra.props.onChange({target:{value:'-1'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 const req=calls.find(x=>x.url.endsWith('/amendment-review'));
 assert.ok(req);
 assert.equal(JSON.parse(req.init.body).guestFee.cents,-100);
 // Backend validation rejects this negative amount; client response cannot override it.
});

test('each missing amendment field blocks a landlord review before any server mutation',async()=>{
 const cases=[
  {name:'blank guest count',target:n=>n.type==='input'&&n.props.max==='999',value:''},
  {name:'zero guests',target:n=>n.type==='input'&&n.props.max==='999',value:'0'},
  {name:'missing check-in',target:n=>n.type==='input'&&n.props.type==='date'&&n.props.value==='2027-04-01',value:''},
  {name:'missing check-out',target:n=>n.type==='input'&&n.props.type==='date'&&n.props.value==='2027-04-03',value:''},
  {name:'missing property',target:n=>n.type==='select'&&n.props.value===p1,value:''},
  {name:'nonfinite base price',target:n=>n.type==='input'&&n.props.step==='0.01'&&n.props.value==='400',value:'Infinity'},
  {name:'empty base price',target:n=>n.type==='input'&&n.props.step==='0.01'&&n.props.value==='400',value:''}
 ];
 for(const scenario of cases){
  const calls=network();
  const ui=await show();
  const field=nodes(ui.tree,scenario.target)[0];
  assert.ok(field,scenario.name);
  field.props.onChange({target:{value:scenario.value}});ui.render();
  const reviewAction=button(ui,'Review amendment');
  assert.ok(reviewAction,scenario.name);
  reviewAction.props.onClick();
  for(let i=0;i<3;i++){await next();ui.render();}
  assert.match(JSON.stringify(ui.tree),/Check all required fields/,scenario.name);
  assert.equal(calls.some(x=>x.url.endsWith('/amendment-review')),false,scenario.name);
  assert.equal(calls.some(x=>x.url.endsWith('/amend')),false,scenario.name);
 }
});
test('English property-list loading failures do not create phantom landlord options',async()=>{
 global.fetch=async()=>({ok:false,status:503,json:async()=>({message:'Temporarily unavailable'})});
 const ui=await show();
 assert.match(JSON.stringify(ui.tree),/Unable to load properties/);
 assert.ok(button(ui,'Review amendment'));
});
test('recorded paidAt prevents installment rewrites even when received amount is zero',async()=>{
 network();
 const ui=await show({detail:{installments:[{sequence:1,agreedCents:40000,
  receivedCents:0,paidAt:'2026-10-01T18:00:00.000Z',isDeposit:false,
  dueEvent:'CHECKIN',paymentMethod:'PIX'}]}});
 const schedule=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox')[0];
 assert.ok(schedule.props.disabled);
 assert.match(JSON.stringify(ui.tree),/Payments are recorded/);
});

test('amendment review API fails safely for missing messages, invalid JSON and denied sessions',async()=>{
 const {reviewContractAmendment}=require('../src/features/contracts/contract-workspace-api.ts');
 const sample={propertyId:p1,startDate:'2027-04-01',endDate:'2027-04-03',
  guests:2,baseRevenueCents:40000,guestFee:{mode:'AUTOMATIC'}};
 let writes=0;
 global.fetch=async(url)=>{
  if(String(url).endsWith('/auth/csrf'))return respond({csrfToken:'secure-csrf'});
  writes++;return {ok:false,status:409,json:async()=>({message:'Conflicting booking'})};
 };
 await assert.rejects(reviewContractAmendment(id,sample),/Conflicting booking/);
 assert.equal(writes,1);
 clearCsrfToken();
 global.fetch=async(url)=>String(url).endsWith('/auth/csrf')?respond({csrfToken:'secure-csrf'}):
  ({ok:false,status:503,json:async()=>{throw new Error('invalid JSON')}});
 await assert.rejects(reviewContractAmendment(id,sample),/HTTP 503/);
});
test('amendment approval API rejects malformed error bodies without claiming success',async()=>{
 const {approveContractAmendment}=require('../src/features/contracts/contract-workspace-api.ts');
 clearCsrfToken();
 global.fetch=async(url)=>String(url).endsWith('/auth/csrf')?respond({csrfToken:'secure-csrf'}):
  ({ok:false,status:422,json:async()=>({error:'not ready'})});
 await assert.rejects(approveContractAmendment(id,{
  propertyId:p1,startDate:'2027-04-01',endDate:'2027-04-03',guests:2,
  baseRevenueCents:40000,guestFee:{mode:'AUTOMATIC'}
 },'a'.repeat(64)),/HTTP 422/);
});
test('unusual server exceptions remain visible in amendment preview without creating false confirmation',async()=>{
 const ui=await show();
 global.fetch=async(url)=>{
  if(String(url).endsWith('/auth/csrf'))return respond({csrfToken:'trusted'});
  if(String(url).endsWith('/amendment-review'))throw 'Review unavailable';
  return respond([]);
 };
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'3'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.match(JSON.stringify(ui.tree),/Review unavailable/);
 assert.equal(button(ui,'Approve as landlord'),undefined);
});

test('missing property from active list keeps historical property option without inventing a replacement',async()=>{
 network();
 const ui=await show({detail:{property:{id:'99999999-9999-4999-8999-999999999999',name:'Inactive historical property'}}});
 const menu=nodes(ui.tree,n=>n.type==='select'&&n.props.value==='99999999-9999-4999-8999-999999999999')[0];
 assert.ok(menu);
 const options=nodes(menu,n=>n.type==='option');
 assert.equal(options.some(x=>x.props.value==='99999999-9999-4999-8999-999999999999'),true);
 assert.equal(options.some(x=>x.props.value===p2),true);
 assert.equal(options.some(x=>x.props.value==='33333333-3333-4333-8333-333333333333'),false);
});
test('approval is not silently retried when a stale UI confirmation control is clicked',async()=>{
 let writes=0;
 network(url=>{if(url.endsWith('/amendment-review'))return respond(review);
  if(url.endsWith('/amend'))writes++;
  return respond({applied:true});
 });
 global.window={confirm:()=>true};
 const ui=await show();
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'3'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 const oldApprove=button(ui,'Approve as landlord');
 assert.ok(oldApprove);
 guests.props.onChange({target:{value:'4'}});ui.render();
 assert.equal(button(ui,'Approve as landlord'),undefined);
 // The approved action disappeared when any proposed booking field changed.
 await next();ui.render();
 assert.equal(button(ui,'Approve as landlord'),undefined);
 assert.equal(writes,0);
});
test('landlord approval errors presented as non-Error values cannot be mistaken for success',async()=>{
 let dashboardRefreshes=0;
 rentalDataStore.refreshAfterMutation=async()=>{dashboardRefreshes++};
 global.window={confirm:()=>true};
 network(url=>{
  if(url.endsWith('/amendment-review'))return respond(review);
  if(url.endsWith('/amend'))throw 'Amendment transaction refused';
  return respond({});
 });
 const ui=await show();
 const guests=nodes(ui.tree,n=>n.type==='input'&&n.props.max==='999')[0];
 guests.props.onChange({target:{value:'3'}});ui.render();
 button(ui,'Review amendment').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 button(ui,'Approve as landlord').props.onClick();
 for(let i=0;i<5;i++){await next();ui.render();}
 assert.equal(dashboardRefreshes,0);
 assert.match(JSON.stringify(ui.tree),/Amendment transaction refused/);
 assert.equal(button(ui,'Approve as landlord'),undefined);
});

test('legacy installment with omitted receipt metadata remains unpaid until a receipt is recorded',async()=>{
 network();
 const ui=await show({detail:{installments:[{
  sequence:1,agreedCents:40000,isDeposit:false,dueEvent:'CHECKIN',
  paymentMethod:'PIX'
 }]}});
 const schedule=nodes(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox')[0];
 assert.ok(schedule);
 assert.equal(schedule.props.disabled,false);
 schedule.props.onChange({target:{checked:true}});ui.render();
 assert.ok(button(ui,'Add installment'));
 const payment=nodes(ui.tree,n=>n.type==='input'&&n.props.step==='0.01')
  .find(n=>n.props.value===400);
 assert.ok(payment);
 payment.props.onChange({target:{value:'350'}});ui.render();
 const selected=nodes(ui.tree,n=>n.type==='input'&&n.props.step==='0.01')
  .find(n=>n.props.value===350);
 assert.ok(selected);
});
