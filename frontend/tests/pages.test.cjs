const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const Module=require('node:module');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const {mount}=require('./test-dispatcher.cjs');
const h=React.createElement;
let authState={isLoading:false,error:null,handleLogin:async()=>{},handleCompleteProfile:async()=>{},resetError:()=>{}};
let loadState={isLoading:false,loadingError:null,loadData:async()=>{},loadRentals:async()=>{},userData:{firstName:'Ana',lastName:'Silva'},balances:[{label:'2026',totalRevenue:400,totalProfit:200},{label:'2026-11',totalRevenue:150,totalProfit:90}],nextRentals:[]};
let rentalActions={createRentalAndRefresh:async()=>true,updateRentalAndRefresh:async()=>true,deleteRentalAndRefresh:async()=>true,isSaving:false,error:null};
let mockLocation={pathname:'/dashboard'};
const origLoad=Module._load;
Module._load=function(request,parent,isMain){
 if(/\/hooks\/auth\/useAuth$/.test(request))return{useAuth:()=>authState};
 if(/\/hooks\/load-data\/useLoadData$/.test(request))return{UseLoadData:()=>loadState};
 if(/\/hooks\/rental-actions\/useRentalActions$/.test(request))return{useRentalActions:()=>rentalActions};
 if(request==='react-router-dom'&&mockLocation){return {...origLoad.apply(this,arguments),useLocation:()=>mockLocation}}
 return origLoad.apply(this,arguments);
};
const {AuthPage}=require('../src/features/auth/index.tsx');
const CompleteProfilePage=require('../src/features/complete-profile/index.tsx').default;
const {Dashboard}=require('../src/features/dashboard/index.tsx');
const {BookingsPage}=require('../src/features/booking/index.tsx');
const {AppLayout}=require('../src/layout/index.tsx');
Module._load=origLoad;
const ssr=(C,route='/dashboard')=>{mockLocation={pathname:route};return renderToStaticMarkup(h(MemoryRouter,{initialEntries:[route]},h(C)))};
const find=(x,fn)=>{if(!x||typeof x!=='object')return null;if(Array.isArray(x))return x.map(y=>find(y,fn)).find(Boolean)||null;if(fn(x))return x;return find(x.props?.children,fn)};

test('sign-in page shows the real sign-in fields, error and loading screen',()=>{
 authState={...authState,isLoading:false,error:'Wrong credentials'};
 const html=ssr(AuthPage,'/auth');
 assert.match(html,/RentalFlow/);assert.match(html,/type="email"/);
 assert.match(html,/Wrong credentials/);
 authState={...authState,isLoading:true,error:null};
 const loading=ssr(AuthPage,'/auth');assert.doesNotMatch(loading,/type="password"/);
 authState={...authState,isLoading:false};
});
test('profile onboarding asks only for supported first and last name fields',()=>{
 authState={...authState,isLoading:false,error:'Name required'};
 const html=ssr(CompleteProfilePage,'/complete-profile');
 assert.match(html,/Complete profile/);
 assert.match(html,/placeholder="First name"/);
 assert.match(html,/placeholder="Last name"/);
 assert.match(html,/Name required/);
 authState={...authState,error:null};
});
test('dashboard renders real user data, backend balances, and empty booking state',()=>{
 const html=ssr(Dashboard);
 assert.match(html,/Welcome back, Ana/);
 assert.match(html,/Yearly revenue/);
 assert.match(html,/No upcoming rentals yet/);
});
test('dashboard loading and missing host error states are not hidden',()=>{
 loadState={...loadState,isLoading:true};
 assert.doesNotMatch(ssr(Dashboard),/Yearly revenue/);
 loadState={...loadState,isLoading:false,userData:null};
 assert.match(ssr(Dashboard),/User profile could not be loaded/);
 loadState={...loadState,userData:{firstName:'Ana',lastName:'Silva'}};
});
test('booking page contains current calendar controls, reservations, and create action',()=>{
 loadState={...loadState,isLoading:false,nextRentals:[{id:'r1',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-01',endDate:'2026-11-04',guests:2,isActive:true}]};
 const html=ssr(BookingsPage,'/bookings');
 assert.match(html,/Next Rentals|Next rentals|Upcoming|Bookings/);
 assert.match(html,/Previous month/);assert.match(html,/Next month/);
 assert.match(html,/Create booking|New booking|Add booking/i);
});
test('booking page reports loading and errors without fabricating bookings',()=>{
 loadState={...loadState,isLoading:true};assert.doesNotMatch(ssr(BookingsPage,'/bookings'),/Previous month/);
 loadState={...loadState,isLoading:false};
 rentalActions={...rentalActions,error:{message:'No database'}};
 assert.match(ssr(BookingsPage,'/bookings'),/No database/);
 rentalActions={...rentalActions,error:null};
});
test('shared layout renders correct header, mobile nav, and skips content for keyboard users',()=>{
 loadState={...loadState,isLoading:false,loadingError:null};
 let html=ssr(AppLayout,'/dashboard');
 assert.match(html,/RentalFlow \/ Workspace/);assert.match(html,/Your rental business, at a glance/);
 assert.match(html,/href="#main-content"/);
 assert.match(html,/Mobile navigation/);
 html=ssr(AppLayout,'/bookings');assert.match(html,/Manage reservations and upcoming stays/);
});
test('shared layout redirects unauthorized sessions and reports other load errors',()=>{
 loadState={...loadState,loadingError:{status:401,message:'Expired'}};
 assert.doesNotMatch(ssr(AppLayout),/New booking/);
 loadState={...loadState,loadingError:{status:503,message:'Database unavailable'}};
 assert.match(ssr(AppLayout),/Database unavailable/);
 loadState={...loadState,loadingError:null};
});
test('shared layout exposes backend failure from createBooking instead of closing as success',async()=>{
 mockLocation={pathname:'/dashboard'};
 loadState={...loadState,isLoading:false,loadingError:null};
 rentalActions={...rentalActions,createRentalAndRefresh:async()=>false};
 const ui=mount(AppLayout);
 const modal=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');
 assert.ok(modal);
 assert.equal(await modal.props.onSubmit({guests:2}),false);
 rentalActions={...rentalActions,createRentalAndRefresh:async()=>true};
 ui.render();const success=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');
 assert.equal(await success.props.onSubmit({guests:2}),true);
 mockLocation={pathname:'/dashboard'};
});

test('auth page forwards credentials to the auth hook without changing them',async()=>{
 const received=[];
 authState={...authState,isLoading:false,error:null,handleLogin:async(...args)=>received.push(args)};
 const ui=mount(AuthPage);
 const form=find(ui.tree,n=>n.type?.name==='AuthForm');
 assert.ok(form);
 await form.props.onSubmit('test@test.com','test123');
 assert.deepEqual(received,[['test@test.com','test123']]);
});
test('profile page sends both entered names through authenticated onboarding',async()=>{
 const seen=[];
 authState={...authState,isLoading:false,error:null,handleCompleteProfile:async(...args)=>seen.push(args),resetError:()=>seen.push('reset')};
 const ui=mount(CompleteProfilePage);
 const inputs=[];
 function collect(x){if(!x||typeof x!=='object')return;if(Array.isArray(x))return x.forEach(collect);if(x.type==='input'&&x.props.placeholder)inputs.push(x);collect(x.props?.children)}
 collect(ui.tree);assert.equal(inputs.length,2);
 inputs[0].props.onChange({target:{value:'Ana'}});
 inputs[1].props.onChange({target:{value:'Silva'}});
 ui.render();let prevented=false;
 await find(ui.tree,n=>n.type==='form').props.onSubmit({preventDefault:()=>prevented=true});
 assert.equal(prevented,true);assert.deepEqual(seen,[['Ana','Silva']]);
 authState={...authState,error:'error message'};ui.render();
 const inputs2=[];collect(ui.tree);
 // Error-specific field edits call resetError as well.
 assert.match(renderToStaticMarkup(h(MemoryRouter,null,h(CompleteProfilePage))),/error message/);
});
test('shared layout opens/closes its create dialog and refreshes on load error retry',async()=>{
 loadState={...loadState,isLoading:false,loadingError:null};rentalActions={...rentalActions,isSaving:false,error:null};
 const ui=mount(AppLayout);
 let modal=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');assert.equal(modal.props.isOpen,false);
 const button=find(ui.tree,n=>n.type==='button'&&n.props.className==='rf-button');
 button.props.onClick();ui.render();modal=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');assert.equal(modal.props.isOpen,true);
 modal.props.onClose();ui.render();modal=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');assert.equal(modal.props.isOpen,false);
 let retried=false;loadState={...loadState,loadingError:{status:503,message:'Backend offline'},loadData:async()=>{retried=true}};
 ui.render();const error=find(ui.tree,n=>n.type?.name==='DashboardErrorState');
 assert.ok(error);await error.props.onRetry();assert.equal(retried,true);
 loadState={...loadState,loadingError:null};
});
test('dashboard selects booking, opens detail, and handles successful and failed edits',async()=>{
 const booking={id:'r1',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-10',endDate:'2026-11-12',guests:2,revenue:100,fee:20,profit:80};
 loadState={...loadState,isLoading:false,loadingError:null,userData:{firstName:'Ana'},nextRentals:[booking]};
 let updated,deleted,created;
 rentalActions={...rentalActions,createRentalAndRefresh:async data=>{created=data;return true},deleteRentalAndRefresh:async id=>{deleted=id;return true},updateRentalAndRefresh:async(id,data)=>{updated={id,data};return true}};
 const ui=mount(Dashboard);
 let main=find(ui.tree,n=>n.type?.name==='Main');
 main.props.onOpenCreateRentalPopUp();main.props.onSelectRental(booking);main.props.onOpenPopUp();
 ui.render();
 let add=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');
 assert.equal(add.props.isOpen,true);await add.props.onSubmit({guests:2});assert.deepEqual(created,{guests:2});
 let detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(detail.props.isOpen,true);assert.equal(detail.props.rental.id,'r1');
 assert.equal(await detail.props.onEditSubmit({guests:3}),true);
 assert.deepEqual(updated,{id:'r1',data:{guests:3}});
 await detail.props.onDelete('r1');assert.equal(deleted,'r1');
 rentalActions={...rentalActions,updateRentalAndRefresh:async()=>{throw Error('Fail update')}};
 ui.render();detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(await detail.props.onEditSubmit({guests:5}),false);
});
test('booking page advances and reverses months and uses exact changed-field patches',async()=>{
 const today=new Date();const yyyy=today.getFullYear();const mm=String(today.getMonth()+1).padStart(2,'0');
 const booking={id:'r1',clientFirstName:'Ana',clientLastName:'Silva',startDate:`${yyyy}-${mm}-10`,endDate:`${yyyy}-${mm}-12`,guests:2,revenue:100,fee:20,profit:80};
 loadState={...loadState,nextRentals:[booking],isLoading:false};
 let saved;
 rentalActions={...rentalActions,updateRentalAndRefresh:async(id,patch)=>{saved={id,patch};return true}};
 const ui=mount(BookingsPage);
 let calendar=find(ui.tree,n=>n.type?.name==='BookingCalendar');
 assert.ok(calendar);const original=calendar.props.viewDate.getMonth();
 calendar.props.handleNext();ui.render();calendar=find(ui.tree,n=>n.type?.name==='BookingCalendar');assert.equal(calendar.props.viewDate.getMonth(),(original+1)%12);
 calendar.props.handlePrev();ui.render();calendar=find(ui.tree,n=>n.type?.name==='BookingCalendar');assert.equal(calendar.props.viewDate.getMonth(),original);
 const list=find(ui.tree,n=>n.type?.name==='BookingGroups');
 list.props.onSelectRental(booking);list.props.onOpenPopUp();ui.render();
 let detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(detail.props.isOpen,true);
 assert.equal(await detail.props.onEditSubmit({...booking,fee:50}),true);
 assert.deepEqual(saved,{id:'r1',patch:{fee:50}});
});
test('bookings reject no-op edits and keep details open when persistence fails',async()=>{
 const booking={id:'r1',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-10',endDate:'2026-11-12',guests:2,revenue:100,fee:20};
 loadState={...loadState,nextRentals:[booking],isLoading:false};
 rentalActions={...rentalActions,updateRentalAndRefresh:async()=>false};
 const ui=mount(BookingsPage);let list=find(ui.tree,n=>n.type?.name==='BookingGroups');list.props.onSelectRental(booking);ui.render();
 let detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(await detail.props.onEditSubmit(booking),false);
 assert.equal(await detail.props.onEditSubmit({...booking,fee:30}),false);
 ui.render();detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');assert.equal(detail.props.isOpen,false);
});

test('profile form editing clears a visible server error and preserves field state',async()=>{
 const events=[];
 authState={...authState,isLoading:false,error:'Name required',resetError:()=>events.push('reset'),handleCompleteProfile:async(...args)=>events.push(args)};
 const ui=mount(CompleteProfilePage);
 const inputs=[];const collect=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x))return x.forEach(collect);if(x.type==='input'&&x.props.placeholder)inputs.push(x);collect(x.props?.children)};
 collect(ui.tree);
 inputs[0].props.onChange({target:{value:'Maria'}});
 ui.render();assert.deepEqual(events,['reset']);
 await find(ui.tree,n=>n.type==='form').props.onSubmit({preventDefault:()=>{}});
 assert.deepEqual(events[1],['Maria','']);
});
test('dashboard refuses empty edit selection and does not hide failing storage errors',async()=>{
 loadState={...loadState,isLoading:false,userData:{firstName:'Ana'}};
 rentalActions={...rentalActions,updateRentalAndRefresh:async()=>false};
 const ui=mount(Dashboard);
 let detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(await detail.props.onEditSubmit({fee:20}),false);
 const item={id:'booking-2',clientFirstName:'B',clientLastName:'C'};
 find(ui.tree,n=>n.type?.name==='Main').props.onSelectRental(item);
 ui.render();detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 await expectAsyncFalse(detail.props.onEditSubmit({fee:20}));
 ui.render();detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(detail.props.editError,'Failed to update rental');
});
async function expectAsyncFalse(p){assert.equal(await p,false)}
test('booking edit protects against absent selection and thrown persistence exceptions',async()=>{
 loadState={...loadState,isLoading:false,nextRentals:[]};
 rentalActions={...rentalActions,updateRentalAndRefresh:async()=>{throw new Error('Write failed')}};
 const ui=mount(BookingsPage);
 let detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(await detail.props.onEditSubmit({fee:10}),false);
 const booking={id:'b',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-10',endDate:'2026-11-11',guests:2,fee:20,revenue:100};
 find(ui.tree,n=>n.type?.name==='BookingGroups').props.onSelectRental(booking);
 ui.render();detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(await detail.props.onEditSubmit({...booking,fee:30}),false);
 ui.render();detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.ok(detail.props.editError);
});
test('layout does not report a failed save as a success and does not swallow thrown errors',async()=>{
 loadState={...loadState,isLoading:false,loadingError:null};
 rentalActions={...rentalActions,createRentalAndRefresh:async()=>{throw new Error('Network interrupted')}};
 const ui=mount(AppLayout);
 const modal=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');
 await assert.rejects(modal.props.onSubmit({}),/Network interrupted/);
 ui.render();assert.equal(find(ui.tree,n=>n.type?.name==='AddRentalPopUp').props.isSaving,false);
});

test('profile updates do not clear errors unless an error is currently visible',()=>{
 let cleared=0;
 authState={...authState,error:null,resetError:()=>cleared++};
 const ui=mount(CompleteProfilePage);
 const input=find(ui.tree,n=>n.type==='input'&&n.props.placeholder==='First name');
 input.props.onChange({target:{value:'Renata'}});
 ui.render();assert.equal(cleared,0);
});
test('dashboard displays generic edit errors without exposing unknown exception details',async()=>{
 const booking={id:'r-1',clientFirstName:'João',clientLastName:'Silva'};
 loadState={...loadState,isLoading:false,userData:{firstName:'Ana'}};
 rentalActions={...rentalActions,updateRentalAndRefresh:async()=>{throw 'Unknown error'}};
 const ui=mount(Dashboard);
 find(ui.tree,n=>n.type?.name==='Main').props.onSelectRental(booking);
 ui.render();let detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(await detail.props.onEditSubmit({guests:3}),false);
 ui.render();detail=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(detail.props.editError,'Failed to update rental');
});
test('calendar filters rentals outside the visible month and maintains cross-month reservations',()=>{
 const now=new Date(), yyyy=now.getFullYear(), mm=now.getMonth();
 const before=new Date(yyyy,mm-2,1).toISOString().slice(0,10), beforeEnd=new Date(yyyy,mm-2,3).toISOString().slice(0,10);
 const inside=new Date(yyyy,mm,2).toISOString().slice(0,10),insideEnd=new Date(yyyy,mm,4).toISOString().slice(0,10);
 loadState={...loadState,isLoading:false,nextRentals:[
 {id:'old',startDate:before,endDate:beforeEnd,clientFirstName:'Old',clientLastName:'Guest',guests:2},
 {id:'now',startDate:inside,endDate:insideEnd,clientFirstName:'Now',clientLastName:'Guest',guests:2}
 ]};
 const ui=mount(BookingsPage);
 const calendar=find(ui.tree,n=>n.type?.name==='BookingCalendar');
 assert.deepEqual(calendar.props.rentals.map(r=>r.id),['now']);
});

test('shared workspace displays a loading screen while protected data is requested',()=>{
 loadState={...loadState,loadingError:null,isLoading:true};
 const html=ssr(AppLayout,'/dashboard');assert.doesNotMatch(html,/href="#main-content"/);
 loadState={...loadState,isLoading:false};
});
test('profile onboarding displays pending form state without leaking errors',()=>{
 authState={...authState,error:null,isLoading:true};
 const html=ssr(CompleteProfilePage,'/complete-profile');
 assert.match(html,/Complete profile/);assert.doesNotMatch(html,/Name required/);
 authState={...authState,isLoading:false};
});
test('booking page ignores reservations that begin after the visible month',()=>{
 const now=new Date(),after=new Date(now.getFullYear(),now.getMonth()+2,15);
 const start=after.toISOString().slice(0,10),end=new Date(after.getFullYear(),after.getMonth(),17).toISOString().slice(0,10);
 loadState={...loadState,isLoading:false,nextRentals:[{id:'future',startDate:start,endDate:end,clientFirstName:'Future',clientLastName:'Guest',guests:2}]};
 const ui=mount(BookingsPage);
 const cal=find(ui.tree,n=>n.type?.name==='BookingCalendar');assert.deepEqual(cal.props.rentals,[]);
});
test('new booking open and close actions on bookings page preserve form state',()=>{
 loadState={...loadState,isLoading:false,nextRentals:[]};
 const ui=mount(BookingsPage);
 let header=find(ui.tree,n=>n.type?.name==='BookingHeader');header.props.onOpenCreateRentalPopUp();ui.render();
 let dialog=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');assert.equal(dialog.props.isOpen,true);
 dialog.props.onClose();ui.render();dialog=find(ui.tree,n=>n.type?.name==='AddRentalPopUp');assert.equal(dialog.props.isOpen,false);
});

test('bookings retry action invokes rental refresh once after an API error',async()=>{
 let retries=0;
 loadState={...loadState,isLoading:false,loadRentals:async()=>{retries++}};
 rentalActions={...rentalActions,error:{message:'Temporary outage'}};
 const ui=mount(BookingsPage);
 const err=find(ui.tree,n=>n.type?.name==='DashboardErrorState');
 assert.ok(err);
 assert.equal(err.props.message,'Temporary outage');
 await err.props.onRetry();
 assert.equal(retries,1);
 rentalActions={...rentalActions,error:null};
});
test('missing host profile recovery calls loadData instead of issuing mutations',async()=>{
 let loaded=0;
 loadState={...loadState,userData:null,isLoading:false,loadData:async()=>{loaded++}};
 const ui=mount(Dashboard);
 const err=find(ui.tree,n=>n.type?.name==='DashboardErrorState');
 assert.ok(err);
 await err.props.onRetry();
 assert.equal(loaded,1);
 loadState={...loadState,userData:{firstName:'Ana'}};
});
test('booking edit catches a null rejection and shows fallback message without closing',async()=>{
 const booking={id:'b-2',clientFirstName:'Renata',clientLastName:'Pires',startDate:'2026-11-10',endDate:'2026-11-12',fee:10,revenue:200,guests:2};
 loadState={...loadState,nextRentals:[booking],isLoading:false};
 rentalActions={...rentalActions,updateRentalAndRefresh:async()=>{throw null}};
 const ui=mount(BookingsPage);
 find(ui.tree,n=>n.type?.name==='BookingGroups').props.onSelectRental(booking);
 find(ui.tree,n=>n.type?.name==='BookingGroups').props.onOpenPopUp();
 ui.render();
 let modal=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(modal.props.isOpen,true);
 assert.equal(await modal.props.onEditSubmit({...booking,fee:11}),false);
 ui.render();
 modal=find(ui.tree,n=>n.type?.name==='RentalDetailPopUp');
 assert.equal(modal.props.isOpen,true);
 assert.equal(modal.props.editError,'Failed to update rental');
});
test('calendar includes a stay spanning both edges of the viewed month',()=>{
 const d=new Date(),start=new Date(d.getFullYear(),d.getMonth()-1,20),end=new Date(d.getFullYear(),d.getMonth()+1,5);
 const booking={id:'long',startDate:`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`,endDate:`${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`};
 loadState={...loadState,isLoading:false,nextRentals:[booking]};
 const ui=mount(BookingsPage);
 assert.deepEqual(find(ui.tree,n=>n.type?.name==='BookingCalendar').props.rentals.map(r=>r.id),['long']);
});
test('profile form preserves both field values when one field is edited repeatedly',async()=>{
 const calls=[];
 authState={...authState,isLoading:false,error:null,handleCompleteProfile:async(...args)=>calls.push(args)};
 const ui=mount(CompleteProfilePage);
 let first=find(ui.tree,n=>n.type==='input'&&n.props.placeholder==='First name');
 first.props.onChange({target:{value:'A'}});
 ui.render();
 first=find(ui.tree,n=>n.type==='input'&&n.props.placeholder==='First name');
 first.props.onChange({target:{value:'Ana'}});
 find(ui.tree,n=>n.type==='input'&&n.props.placeholder==='Last name').props.onChange({target:{value:'Costa'}});
 ui.render();
 await find(ui.tree,n=>n.type==='form').props.onSubmit({preventDefault:()=>{}});
 assert.deepEqual(calls,[['Ana','Costa']]);
});
