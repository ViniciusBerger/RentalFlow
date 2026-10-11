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

test('waiver and adjustment selections are sent for backend pricing rather than applied in UI',async()=>{
 const requests=[];
 global.fetch=async(url,init)=>{
  if(String(url).endsWith('/auth/csrf'))return respond({csrfToken:'test'});
  if(String(url).endsWith('/properties'))return respond(property);
  if(String(url).endsWith('/rental/quote')){
   requests.push(JSON.parse(init.body));return respond(quote);
  }
  return respond({message:'Unexpected endpoint'},404);
 };
 const ui=mount(Popup,{isOpen:true,onSubmit:async()=>false,onClose:()=>{},isSaving:false,error:null});
 for(const [name,value] of Object.entries({
  propertyId:property[0].id,startDate:'2026-12-01',endDate:'2026-12-03',
  guests:'3',revenue:'200'
 }))form(ui).props.handleChange({target:{name,value}});
 ui.render();
 let fields=form(ui);
 fields.props.handleContractChange({target:{name:'feeMode',value:'WAIVED'}});
 fields.props.handleContractChange({target:{name:'feeReason',value:'Approved in advance'}});
 ui.render();
 await form(ui).props.onQuote();
 ui.render();
 assert.equal(requests[0].guestFee.mode,'WAIVED');
 assert.equal(requests[0].guestFee.reason,'Approved in advance');
 assert.equal(form(ui).props.quote.totalCents,21000);
 fields=form(ui);
 fields.props.handleContractChange({target:{name:'feeMode',value:'ADJUSTED'}});
 fields.props.handleContractChange({target:{name:'feeAdjustment',value:'25.50'}});
 ui.render();
 assert.equal(form(ui).props.quote,null);
 await form(ui).props.onQuote();
 assert.deepEqual(requests[1].guestFee,{mode:'ADJUSTED',cents:2550,reason:'Approved in advance'});
});
test('failed quote never confirms a booking and reports a recoverable error',async()=>{
 let saved=0;
 global.fetch=async url=>{
  if(String(url).endsWith('/auth/csrf'))return respond({csrfToken:'test'});
  if(String(url).endsWith('/properties'))return respond(property);
  return respond({message:'Occupancy limit exceeded'},400);
 };
 const ui=mount(Popup,{isOpen:true,onSubmit:async()=>{saved++;return true},
  onClose:()=>{},isSaving:false,error:null});
 form(ui).props.handleChange({target:{name:'propertyId',value:property[0].id}});
 ui.render();
 await form(ui).props.onQuote();
 ui.render();
 assert.equal(form(ui).props.quote,null);
 assert.match(form(ui).props.quoteError,/Occupancy limit exceeded/);
 await form(ui).props.handleSubmit(event);
 assert.equal(saved,0);
});

test('enabled booking form renders server-reviewed total and translated approval states',()=>{
 const React=require('react');
 const {renderToStaticMarkup}=require('react-dom/server');
 const {LanguageProvider}=require('../src/i18n/language.tsx');
 const {AddRentalForm}=require('../src/components/add-rental-popup/add-rental-form.tsx');
 const props={
  handleSubmit:()=>{},handleChange:()=>{},handleContractChange:()=>{},
  onQuote:()=>{},contractForm:{cpf:'',rg:'',address:'',phone:'',email:'',
   nationality:'BR',maritalStatus:'',feeMode:'AUTOMATIC',feeReason:'',
   feeAdjustment:'',paymentMethod:'PIX',paymentDueEvent:'KEY_HANDOVER'},
  formData:{clientFirstName:'Ana',clientLastName:'Silva',
   startDate:'2026-12-01',endDate:'2026-12-03',propertyId:property[0].id,
   guests:'3',revenue:200,fee:20},
  contractBookingEnabled:true,quote:quote,quoteBusy:false,
  quoteError:'',isSaving:false,error:null
 };
 const markup=(locale,updates={})=>renderToStaticMarkup(React.createElement(
  LanguageProvider,{initialLocale:locale},React.createElement(AddRentalForm,{...props,...updates})
 ));
 const english=markup('en');
 assert.match(english,/Base rental price/);
 assert.match(english,/Price calculated by server/);
 assert.match(english,/Booking total/);
 assert.match(english,/210/);
 assert.doesNotMatch(english,/Review the server-calculated total before/);
 const portuguese=markup('pt-BR');
 assert.match(portuguese,/Preço base da estadia/);
 assert.match(portuguese,/Cálculo confirmado pelo servidor/);
 assert.match(portuguese,/Total da reserva/);
 const pending=markup('en',{quote:null,quoteBusy:true,quoteError:'Occupancy limit exceeded'});
 assert.match(pending,/Calculating on server/);
 assert.match(pending,/Occupancy limit exceeded/);
 assert.doesNotMatch(pending,/Price calculated by server/);
 assert.match(pending,/disabled/);
 const unreviewed=markup('pt-BR',{quote:null,quoteBusy:false,quoteError:''});
 assert.match(unreviewed,/Conferir valor total antes de reservar/);
 assert.doesNotMatch(unreviewed,/Cálculo confirmado pelo servidor/);
 assert.match(unreviewed,/disabled/);
 const old=markup('en',{contractBookingEnabled:false,quote:null});
 assert.doesNotMatch(old,/Review total before booking/);
});
