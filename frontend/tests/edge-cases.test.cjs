const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const {createRentalDataStore}=require('../src/hooks/load-data/rental-data-store.ts');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const {mount:originalMount}=require('./test-dispatcher.cjs');
process.env.VITE_API_URL='http://localhost:3000';
const {AuthForm}=require('../src/features/auth/components/auth-form/index.tsx');
const {AddRentalForm}=require('../src/components/add-rental-popup/add-rental-form.tsx');
const {NextRentals}=require('../src/components/next-rentals/index.tsx');
const {RentalDetailHeader}=require('../src/components/rental-detail-popup/components/header/index.tsx');
const {TextInputFormDiv}=require('../src/components/text-input-form/index.tsx');
const {SubmitButton}=require('../src/components/buttons/submit-button/index.tsx');
const {GenericButton}=require('../src/components/buttons/generic-button/index.tsx');
const {MobileNavBar}=require('../src/components/nav-bar/mobile-navbar/index.tsx');
const {CalendarMain}=require('../src/features/booking/components/booking-calendar/calendar-main/index.tsx');
const {calendarDisplay}=require('../src/features/booking/service/calendar-service.tsx');
const EditRentalPopUp=require('../src/components/edit-rental-popup/index.tsx').default;
const {useRentalActions}=require('../src/hooks/rental-actions/useRentalActions.tsx');
const {UseLoadData}=require('../src/hooks/load-data/useLoadData.tsx');
const {useRentalDataStore}=require('../src/hooks/load-data/useRentalDataStore.ts');
const authApi=require('../src/hooks/auth/auth-service.tsx');
const {login,getMe}=authApi;
const {loadBalance}=require('../src/hooks/load-data/balance-service.ts');
const {loadNextRentals,loadUserData}=require('../src/hooks/load-data/load-data.service.ts');
const rentalApi=require('../src/hooks/rental-actions/rental-service.ts');
const h=React.createElement,noop=()=>{},ssr=(C,p)=>renderToStaticMarkup(h(MemoryRouter,null,h(C,p)));
const respond=(status,payload)=>({ok:status>=200&&status<300,status,json:async()=>payload});
const badJson=status=>({ok:false,status,json:async()=>{throw new SyntaxError('bad JSON')}});
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const secure=(fetchImpl)=>{
 if(typeof fetchImpl!=='function'||fetchImpl.__csrfWrapped)return fetchImpl;
 const wrapper=async (url,opts)=>String(url).endsWith('/auth/csrf')?
  respond(200,{csrfToken:'test-session-bound-token'}):fetchImpl(url,opts);
 wrapper.__csrfWrapped=true;return wrapper;
};
const protect=()=>{global.fetch=secure(global.fetch);};

const mount=(...args)=>{protect();return originalMount(...args)};
const completeProfile=(...args)=>{protect();return authApi.completeProfile(...args)};
const logout=(...args)=>{protect();return authApi.logout(...args)};
const addRental=(...args)=>{protect();return rentalApi.addRental(...args)};
const updateRental=(...args)=>{protect();return rentalApi.updateRental(...args)};
const deleteRental=(...args)=>{protect();return rentalApi.deleteRental(...args)};
const find=(x,fn)=>{if(!x||typeof x!=='object')return null;if(Array.isArray(x))return x.map(y=>find(y,fn)).find(Boolean)||null;if(fn(x))return x;return find(x.props?.children,fn)};
afterEach(()=>{delete global.fetch;clearCsrfToken()});

test('status badges distinguish cancelled from active booking',()=>{
 const base={clientFirstName:'Ana',clientLastName:'Silva'};
 assert.match(ssr(RentalDetailHeader,{rental:{...base,isActive:false}}),/Await Confirmation/);
 assert.match(ssr(RentalDetailHeader,{rental:{...base,isActive:true}}),/Confirmed Stay/);
});
test('optional label and input value defaults do not cause uncontrolled form markup',()=>{
 const html=ssr(TextInputFormDiv,{type:'text',placeholder:'Name',value:undefined,onChange:noop});
 assert.doesNotMatch(html,/<label/);assert.match(html,/value=""/);
 assert.match(ssr(TextInputFormDiv,{type:'text',placeholder:'Name',value:'Ana',onChange:noop,label:'First name'}),/First name/);
});
test('button loading and display states include disabled and customizable labels',()=>{
 const loading=ssr(SubmitButton,{type:'submit',isLoading:true,context:'Save'});
 const normal=ssr(SubmitButton,{type:'submit',isLoading:false,context:'Save'});
 assert.match(loading,/Loading\.\.\./);assert.match(loading,/disabled/);
 assert.match(normal,/Save/);assert.doesNotMatch(normal,/disabled/);
 assert.match(ssr(GenericButton,{content:'Edit'}),/Edit/);
 assert.match(ssr(GenericButton,{content:'Edit',className:'custom-button'}),/custom-button/);
});
test('empty-form defaults and missing guests render stable field values',()=>{
 const html=ssr(AddRentalForm,{handleSubmit:noop,handleChange:noop,error:null,isSaving:false});
 assert.match(html,/name="clientFirstName"/);assert.doesNotMatch(html,/Date already booked/);
 const missing=ssr(AddRentalForm,{handleSubmit:noop,handleChange:noop,error:null,isSaving:false,formData:{clientFirstName:'',clientLastName:'',startDate:'',endDate:'',revenue:0,fee:0,guests:null}});
 assert.match(missing,/name="guests"/);
});
test('next booking dates tolerate empty and complete ISO timestamps',()=>{
 const html=ssr(NextRentals,{rentals:[{id:'x',startDate:'',endDate:'2026-11-02T12:00:00Z',clientFirstName:'A',clientLastName:'B',guests:null}],onOpenPopUp:noop,onSelectRental:noop,headerContent:'Next'});
 assert.match(html,/0 guests/);assert.match(html,/—/);assert.match(html,/Nov/);
});
test('mobile navigation supports both active and inactive states',()=>{
 const nav=mount(MobileNavBar,{onCreateClick:noop}).tree;const links=nav.props.children.filter(Boolean).filter(x=>x.type?.name==='NavLink'||x.props?.to);
 assert.equal(links.length,3);
 for(const link of links){assert.match(link.props.className({isActive:true}),/active/);assert.doesNotMatch(link.props.className({isActive:false}),/active/)}
});
test('edit form treats absent rental fields as defaults and never closes on API rejection',async()=>{
 const props={rental:{clientFirstName:'Ana'},isOpen:true,onSubmit:async()=>{throw Error('No database')},onClose:noop,isSaving:false,error:null};
 const ui=mount(EditRentalPopUp,props);ui.render();
 let form=find(ui.tree,x=>x.type?.name==='AddRentalForm');
 assert.equal(form.props.formData.clientLastName,'');assert.equal(form.props.formData.revenue,0);
 assert.equal(form.props.formData.guests,0);
 form.props.handleChange({target:{name:'fee',value:''}});
 form.props.handleChange({target:{name:'clientFirstName',value:'larissa'}});
 ui.render();form=find(ui.tree,x=>x.type?.name==='AddRentalForm');
 assert.equal(form.props.formData.fee,0);assert.equal(form.props.formData.clientFirstName,'Larissa');
 await assert.rejects(form.props.handleSubmit({preventDefault:noop}),/No database/);
});
test('calendar renders invalid/empty input arrays without creating booking bars',()=>{
 const html=ssr(CalendarMain,{viewDate:new Date(2026,10,1),rentals:[]});
 assert.equal((html.match(/border-r border-b border-sage-50/g)||[]).length,42);
 assert.deepEqual(calendarDisplay([],new Date(2026,10,1)),[]);
});
test('all auth APIs preserve the fallback error when response JSON is invalid',async()=>{
 global.fetch=async()=>badJson(503);
 for(const run of [()=>getMe(),()=>completeProfile({firstName:'A',lastName:'B'}),()=>login('a','b')]){
   await assert.rejects(run(),e=>e.status===503&&/Unable to/.test(e.message));
 }
});
test('finance APIs propagate malformed 503 responses for both periods',async()=>{
 let calls=[];global.fetch=async url=>{calls.push(url);return badJson(503)};
 await assert.rejects(loadBalance(),e=>e.status===503&&/Unable to fetch session/.test(e.message));
 assert.equal(calls.length,2);
 global.fetch=async url=>{calls.push(url);return url.endsWith('/balance/monthly')?badJson(503):respond(200,[{label:'2026',totalRevenue:200}])};
 // Both independent balance requests run concurrently
 await assert.rejects(loadBalance(),e=>e.status===503);
});
test('rental loading APIs use fallback errors if backend returns invalid JSON',async()=>{
 global.fetch=async()=>badJson(502);
 await assert.rejects(loadNextRentals(),e=>e.status===502&&e.message==='Unable to fetch session');
 await assert.rejects(loadUserData(),e=>e.status===502&&e.message==='Unable to fetch session');
});
test('rental mutation APIs use fallback errors if backend returns invalid JSON',async()=>{
 global.fetch=async()=>badJson(502);
 const spy=console.error;console.error=noop;
 try {
  await assert.rejects(addRental({}),e=>e.status===502&&e.message==='Unable to fetch session');
  await assert.rejects(deleteRental('r-1'),e=>e.status===502&&e.message==='Unable to fetch session');
  await assert.rejects(updateRental('r-1',{}),e=>e.status===502);
 }finally{console.error=spy}
});
test('rentals hook does not require a refresh handler for successful mutations',async()=>{
 global.fetch=async(url,opt)=>respond(opt.method==='POST'?201:200,opt.method==='POST'?{id:'r1'}:true);
 const ui=mount(()=>useRentalActions());
 assert.equal(await ui.tree.createRentalAndRefresh({}),true);
 assert.equal(await ui.tree.deleteRentalAndRefresh('r1'),true);
 assert.equal(await ui.tree.updateRentalAndRefresh('r1',{fee:10}),true);
});
test('rental hook properly handles missing error messages without crashing',async()=>{
 global.fetch=async()=>{throw {}};
 const ui=mount(()=>useRentalActions());
 assert.equal(await ui.tree.deleteRentalAndRefresh('r1'),false);
 ui.render();assert.equal(ui.tree.error,'Failed to delete rental');
 assert.equal(await ui.tree.updateRentalAndRefresh('r1',{}),false);
 ui.render();assert.equal(ui.tree.error,'Failed to update rental');
});
test('load-data handles missing error messages and refresh success independently',async()=>{
 global.fetch=async()=>{throw {status:502}};
 const store=createRentalDataStore(); const ui=mount(()=>useRentalDataStore(store));await assert.rejects(ui.tree.loadData());ui.render();
 assert.equal(ui.tree.loadingError.message,'Unable to load rental data');
 global.fetch=async url=>respond(200,url.endsWith('/rental/findall')?[{id:'r1'}]:[]);
 await ui.tree.loadRentals();ui.render();
 assert.equal(ui.tree.loadingError.status,502); // a background refresh cannot clear an initial authentication failureassert.equal(ui.tree.isLoading,false);assert.deepEqual(ui.tree.nextRentals,[{id:'r1'}]);
});

test('a partially configured frontend uses the auth service localhost fallback in development',async()=>{
 const filepath=require.resolve('../src/hooks/auth/auth-service.tsx');
 delete require.cache[filepath];
 const previous=process.env.VITE_API_URL;
 delete process.env.VITE_API_URL;
 let received;
 global.fetch=async url=>{received=url;return respond(200,{message:'ok'})};
 const fresh=require('../src/hooks/auth/auth-service.tsx');
 await fresh.login('test@test.com','test123');
 assert.match(received,/localhost:3000\/auth\/login$/);
 process.env.VITE_API_URL=previous;
});
test('finance API fallback error is used when server responds with empty JSON object',async()=>{
 global.fetch=async()=>respond(500,{});
 await assert.rejects(loadBalance(),e=>e.status===500&&e.message==='Unable to fetch session');
});
test('rental actions report rejected requests even when response is no JSON',async()=>{
 const spy=console.error;console.error=noop;
 try{
 global.fetch=async()=>{throw {}};
 const ui=mount(()=>useRentalActions());
 assert.equal(await ui.tree.createRentalAndRefresh({}),false);
 ui.render();assert.equal(ui.tree.isSaving,false);
 }finally{console.error=spy}
});
test('loadRentals stores a clear fallback message for unexpected exceptions',async()=>{
 global.fetch=async()=>{throw {status:500}};
 const store=createRentalDataStore(); const ui=mount(()=>useRentalDataStore(store));
 await assert.rejects(ui.tree.loadData());ui.render();
 await assert.rejects(ui.tree.loadRentals(),e=>e.status===500);
 ui.render();assert.equal(ui.tree.refreshError,'Unable to load rental data');assert.equal(ui.tree.isLoading,false);
});

test('edit popup with a closed state never starts an edit even if booking was selected',()=>{
 const ui=mount(EditRentalPopUp,{isOpen:false,rental:{clientFirstName:'Ana'},onSubmit:async()=>true,onClose:noop,isSaving:false,error:null});
 assert.equal(ui.tree,null);
});
test('edit popup with missing rental retains empty form defaults',()=>{
 const ui=mount(EditRentalPopUp,{isOpen:true,rental:null,onSubmit:async()=>true,onClose:noop,isSaving:false,error:null});
 const form=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 assert.equal(form.props.formData.clientFirstName,'');
});
test('optional delete callback may be absent without crashing confirmation flow',()=>{
 const RentalDetailPopUp=require('../src/components/rental-detail-popup/index.tsx').default;
 const ui=mount(RentalDetailPopUp,{isOpen:true,rental:{id:'r1',clientFirstName:'Ana',clientLastName:'Silva',isActive:true,startDate:'2026-11-01',endDate:'2026-11-02',revenue:100,fee:0,profit:100},onClose:noop,onEditSubmit:async()=>true,isSavingEdit:false,editError:null});
 find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='').props.onClick();ui.render();
 assert.doesNotThrow(()=>find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='Delete').props.onClick());
});
test('monthly summary error returns status even with no backend message',async()=>{
 let n=0;global.fetch=async()=>{n++;return n===1?respond(200,[{label:'2026',totalRevenue:100}]):respond(403,{})};
 await assert.rejects(loadBalance(),e=>e.status===403&&e.message==='Unable to fetch session');
});
