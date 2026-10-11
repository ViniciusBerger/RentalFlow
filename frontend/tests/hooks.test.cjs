const { test, afterEach }=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const {createRentalDataStore}=require('../src/hooks/load-data/rental-data-store.ts');
const { mount }=require('./test-dispatcher.cjs');
process.env.VITE_API_URL='http://localhost:3000';
const { useRentalActions }=require('../src/hooks/rental-actions/useRentalActions.tsx');
const {UseLoadData}=require('../src/hooks/load-data/useLoadData.tsx');
const {useRentalDataStore}=require('../src/hooks/load-data/useRentalDataStore.ts');
afterEach(()=>{delete global.fetch});
const respond=(status,payload)=>({ok:status>=200&&status<300,status,json:async()=>payload});

test('create action returns true only after API success and a completed refresh',async()=>{
 const calls=[];global.fetch=async(url)=>{calls.push(url);return respond(201,{id:'r-1'})};
 let refreshed=0;const ui=mount(()=>useRentalActions(async()=>{refreshed++}));
 assert.equal(await ui.tree.createRentalAndRefresh({startDate:'2026-11-02'}),true);
 assert.equal(refreshed,1);
 ui.render();assert.equal(ui.tree.isSaving,false);
 assert.equal(calls.length,1);
});
test('failed create reports false, does not refresh and exposes server validation error',async()=>{
 global.fetch=async()=>respond(409,{message:'Date already booked.'});
 let refreshed=false;const ui=mount(()=>useRentalActions(async()=>{refreshed=true}));
 assert.equal(await ui.tree.createRentalAndRefresh({}),false);
 ui.render();assert.equal(ui.tree.error,'Date already booked.');assert.equal(ui.tree.isSaving,false);assert.equal(refreshed,false);
 ui.tree.resetError();ui.render();assert.equal(ui.tree.error,null);
});
test('delete action handles API boolean=false as failure instead of reporting a deletion',async()=>{
 global.fetch=async()=>respond(200,false);
 let refreshed=false;const ui=mount(()=>useRentalActions(async()=>{refreshed=true}));
 assert.equal(await ui.tree.deleteRentalAndRefresh('missing'),false);
 ui.render();assert.equal(ui.tree.error,'Failed to delete rental');assert.equal(refreshed,false);
});
test('delete action refreshes only on confirmed success',async()=>{
 global.fetch=async()=>respond(200,true);
 let refreshed=0;const ui=mount(()=>useRentalActions(async()=>{refreshed++}));
 assert.equal(await ui.tree.deleteRentalAndRefresh('r-1'),true);
 assert.equal(refreshed,1);
});
test('update action handles API boolean=false as failure instead of reporting an update',async()=>{
 global.fetch=async()=>respond(200,false);
 let refreshed=false;const ui=mount(()=>useRentalActions(async()=>{refreshed=true}));
 assert.equal(await ui.tree.updateRentalAndRefresh('missing',{fee:50}),false);
 ui.render();assert.equal(ui.tree.error,'Failed to update rental');assert.equal(refreshed,false);
});
test('update action refreshes only when the API confirms success',async()=>{
 global.fetch=async()=>respond(200,true);
 let refreshed=0;const ui=mount(()=>useRentalActions(async()=>{refreshed++}));
 assert.equal(await ui.tree.updateRentalAndRefresh('r-1',{fee:50}),true);
 assert.equal(refreshed,1);
});
test('mutation actions surface network and refresh errors and reset saving state',async()=>{
 global.fetch=async()=>{throw new Error('Network down')};
 const ui=mount(()=>useRentalActions());
 assert.equal(await ui.tree.createRentalAndRefresh({}),false);
 ui.render();assert.equal(ui.tree.error,'Network down');assert.equal(ui.tree.isSaving,false);
 global.fetch=async()=>respond(200,true);
 const ui2=mount(()=>useRentalActions(async()=>{throw new Error('Refresh failed')}));
 assert.equal(await ui2.tree.updateRentalAndRefresh('r-1',{fee:90}),false);
 ui2.render();assert.equal(ui2.tree.error,'Refresh failed');
});
test('useRentalActions forwards getNextRentals to the backend service',async()=>{
 global.fetch=async(url)=>{assert.match(url,/\/rental\/findall$/);return respond(200,[{id:'r-1'}])};
 const ui=mount(()=>useRentalActions());
 assert.deepEqual(await ui.tree.getNextRentals(),[{id:'r-1'}]);
});
test('load-data hook fetches profile, financial summary and bookings and clears loading flag',async()=>{
 global.fetch=async url=>{
  if(url.endsWith('/balance/yearly'))return respond(200,[{label:'2026',totalRevenue:300}]);
  if(url.endsWith('/balance/monthly'))return respond(200,[{label:'2026-11',totalRevenue:200}]);
  if(url.endsWith('/rental/findall'))return respond(200,[{id:'r-1'}]);
  if(url.endsWith('/user/host'))return respond(200,{firstName:'Ana'});
  throw Error(url);
 };
 const store=createRentalDataStore(); const ui=mount(()=>useRentalDataStore(store));await ui.tree.loadData();ui.render();
 assert.equal(ui.tree.isLoading,false);
 assert.equal(ui.tree.userData.firstName,'Ana');
 assert.equal(ui.tree.nextRentals.length,1);
 assert.equal(ui.tree.balances[0].totalRevenue,300);
});
test('load-data hook records authorization failures and avoids leaking data',async()=>{
 global.fetch=async()=>respond(401,{message:'Session expired'});
 const store=createRentalDataStore(); const ui=mount(()=>useRentalDataStore(store));await assert.rejects(ui.tree.loadData());ui.render();
 assert.equal(ui.tree.isLoading,false);
 assert.equal(ui.tree.loadingError.status,401);
 assert.equal(ui.tree.loadingError.message,'Session expired');
 ui.tree.resetError();ui.render();assert.equal(ui.tree.loadingError,null);
});
test('refresh rentals recovers loading state after a rejected request',async()=>{
 global.fetch=async()=>respond(500,{message:'Offline'});
 const store=createRentalDataStore(); const ui=mount(()=>useRentalDataStore(store));
 await assert.rejects(ui.tree.loadRentals(),e=>e.status===500);
 ui.render();assert.equal(ui.tree.isLoading,false);
 assert.equal(ui.tree.refreshError,'Offline');
});

test('each mutation handles failed post-save refresh without reporting false success',async()=>{
 global.fetch=async(url,options)=>respond(options.method==='POST'?201:200,options.method==='POST'?{id:'1'}:true);
 const ui=mount(()=>useRentalActions(async()=>{throw {}}));
 assert.equal(await ui.tree.createRentalAndRefresh({}),false);
 assert.equal(await ui.tree.deleteRentalAndRefresh('r1'),false);
 assert.equal(await ui.tree.updateRentalAndRefresh('r1',{fee:40}),false);
 ui.render();assert.equal(ui.tree.isSaving,false);
});
test('loadData applies a default error message when the error object has none',async()=>{
 global.fetch=async()=>{throw {status:503}};
 const store=createRentalDataStore(); const ui=mount(()=>useRentalDataStore(store));
 await assert.rejects(ui.tree.loadData());ui.render();
 assert.equal(ui.tree.loadingError.message,'Unable to load rental data');
 assert.equal(ui.tree.loadingError.status,503);
});
