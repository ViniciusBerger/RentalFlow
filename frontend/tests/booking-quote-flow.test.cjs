const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_CONTRACT_BOOKING_DRAFTS_ENABLED='true';
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {mount}=require('./test-dispatcher.cjs');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const Popup=require('../src/components/add-rental-popup/index.tsx').default;
const original=global.fetch;
const property=[{id:'11111111-1111-4111-8111-111111111111',name:'Test house',isActive:true}];
const respond=(body,status=200)=>({status,ok:status>=200&&status<300,json:async()=>body});
const find=(node,fn)=>{
 if(!node||typeof node!=='object')return null;
 if(Array.isArray(node))return node.map(x=>find(x,fn)).find(Boolean)||null;
 if(fn(node))return node;return find(node.props?.children,fn);
};
const form=view=>find(view.tree,n=>n.type?.name==='AddRentalForm');
const event={preventDefault:()=>{}};
const quote={baseCents:20000,calculatedExtraCents:1000,
 chargedExtraCents:1000,totalCents:21000,nights:2,guests:3};
afterEach(()=>{global.fetch=original;clearCsrfToken();});

test('booking requires server quote and confirms server result rather than a client price',async()=>{
 let requested=null,received=null,closed=0;
 global.fetch=async(url,init)=>{
  if(String(url).endsWith('/auth/csrf'))return respond({csrfToken:'test'});
  if(String(url).endsWith('/properties'))return respond(property);
  requested={url,init};
  return {status:201,ok:true,json:async()=>quote};
 };
 const view=mount(Popup,{isOpen:true,onSubmit:async payload=>{received=payload;return true},
  onClose:()=>closed++,isSaving:false,error:null});
 const initial=form(view);
 assert.equal(initial.props.contractBookingEnabled,true);
 for(const [name,value] of Object.entries({
  clientFirstName:'Ana',clientLastName:'Silva',
  propertyId:'11111111-1111-4111-8111-111111111111',
  startDate:'2026-12-01',endDate:'2026-12-03',guests:'3',revenue:'200',fee:'20'
 }))initial.props.handleChange({target:{name,value}});
 view.render();
 await form(view).props.handleSubmit(event);
 assert.equal(received,null);
 await form(view).props.onQuote();
 view.render();
 assert.ok(requested);
 assert.match(String(requested.url),/\/rental\/quote$/);
 assert.deepEqual(JSON.parse(requested.init.body),{
  propertyId:'11111111-1111-4111-8111-111111111111',
  startDate:'2026-12-01',endDate:'2026-12-03',
  guests:3,revenue:200,guestFee:{mode:'AUTOMATIC'}
 });
 assert.equal(form(view).props.quote.totalCents,21000);
 await form(view).props.handleSubmit(event);
 assert.equal(received.bookingDraft.confirmedTotalCents,21000);
 assert.equal(received.bookingDraft.baseRevenueCents,20000);
 assert.equal(received.bookingDraft.guestFee.mode,'AUTOMATIC');
 assert.match(received.bookingDraft.requestKey,/^[0-9a-f-]{36}$/);
 assert.equal(closed,1);
});
test('changing the number of guests invalidates the previously confirmed total',async()=>{
 let submitted=0;
 global.fetch=async url=>String(url).endsWith('/auth/csrf')
  ?respond({csrfToken:'test'})
  :String(url).endsWith('/properties')?respond(property):respond(quote);
 const ui=mount(Popup,{isOpen:true,onSubmit:async()=>{submitted++;return true},
  onClose:()=>{},isSaving:false,error:null});
 for(const [name,value] of Object.entries({
  propertyId:'11111111-1111-4111-8111-111111111111',startDate:'2026-12-01',
  endDate:'2026-12-03',guests:'3',revenue:'200'
 }))form(ui).props.handleChange({target:{name,value}});
 ui.render();await form(ui).props.onQuote();ui.render();
 assert.ok(form(ui).props.quote);
 form(ui).props.handleChange({target:{name:'guests',value:'4'}});
 ui.render();assert.equal(form(ui).props.quote,null);
 await form(ui).props.handleSubmit(event);
 assert.equal(submitted,0);
});
