const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const {createRentalDataStore}=require('../src/hooks/load-data/rental-data-store.ts');
const wait=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
const fake=()=>({dashboard:async()=>[{label:'2026',totalRevenue:200},null,[{label:'2026-01'}]],rentals:async()=>[{id:'r1'}],user:async()=>({firstName:'Ana'})});

test('multiple mounted consumers share one initial request and stable snapshot',async()=>{
 const calls={dashboard:0,rentals:0,user:0};const gate=wait();const stub=fake();
 const loaders=Object.fromEntries(Object.entries(stub).map(([key,fn])=>[key,async()=>{calls[key]++;await gate.promise;return fn()}]));
 const store=createRentalDataStore(loaders);
 const callbacks=[];store.subscribe(()=>callbacks.push(store.getSnapshot()));
 const a=store.initialize(),b=store.initialize(),c=store.initialize();
 assert.deepEqual(calls,{dashboard:1,rentals:1,user:1});gate.resolve();await Promise.all([a,b,c]);
 assert.deepEqual(calls,{dashboard:1,rentals:1,user:1});await store.initialize();
 assert.deepEqual(calls,{dashboard:1,rentals:1,user:1});assert.equal(store.getSnapshot().isLoading,false);
 assert.equal(store.getSnapshot().userData.firstName,'Ana');assert.equal(store.getSnapshot().balances[0].totalRevenue,200);
 assert.ok(callbacks.length>=2);
});
test('background booking refresh does not block the UI or refetch user and balances',async()=>{
 const gate=wait();let rentalCalls=0,financialCalls=0,userCalls=0;
 const store=createRentalDataStore({dashboard:async()=>{financialCalls++;return [null,null,[]]},rentals:async()=>{rentalCalls++;return rentalCalls===1?[]:gate.promise},user:async()=>{userCalls++;return {firstName:'A'}}});
 await store.initialize();const refresh=store.loadRentals();
 assert.equal(store.getSnapshot().isLoading,false);assert.equal(store.getSnapshot().isRefreshing,true);
 assert.equal(financialCalls,1);assert.equal(userCalls,1);gate.resolve([{id:'r2'}]);await refresh;
 assert.equal(store.getSnapshot().isRefreshing,false);assert.deepEqual(store.getSnapshot().nextRentals,[{id:'r2'}]);
});
test('mutations refresh only balances and bookings concurrently; failed refresh remains nonfatal',async()=>{
 const gate=wait();let userCalls=0,finance=0,rental=0;
 const store=createRentalDataStore({dashboard:async()=>{finance++;return finance===1?[{label:'old'},null,[]]:gate.promise},rentals:async()=>{rental++;if(rental===1)return [];throw Error('fetch failed')},user:async()=>{userCalls++;return {firstName:'Ana'}}});
 await store.initialize();const refresh=store.refreshAfterMutation();const duplicate=store.refreshAfterMutation();
 assert.equal(finance,2);assert.equal(rental,2);assert.equal(store.getSnapshot().isLoading,false);
 gate.resolve([{label:'new'},null,[]]);await Promise.all([refresh,duplicate]);
 assert.equal(finance,2);assert.equal(rental,2);assert.equal(userCalls,1);
 assert.equal(store.getSnapshot().balances[0].label,'new');assert.equal(store.getSnapshot().refreshError,'fetch failed');
});
test('initial fetch failure allows a retry and retains error status',async()=>{
 let fails=true;const st=createRentalDataStore({dashboard:async()=>[null,null,[]],rentals:async()=>{if(fails)throw {status:401,message:'Unauthorized'};return []},user:async()=>({})});
 await assert.rejects(st.initialize());assert.equal(st.getSnapshot().isLoading,false);
 assert.equal(st.getSnapshot().loadingError.status,401);fails=false;
 await st.loadData();assert.equal(st.getSnapshot().loadingError,null);assert.equal(st.getSnapshot().isLoading,false);
 st.resetError();assert.equal(st.getSnapshot().refreshError,null);
});
test('sign-out invalidates every in-flight response so the next user never sees stale data',async()=>{
 const gate=wait();const st=createRentalDataStore({dashboard:async()=>[null,null,[]],rentals:async()=>gate.promise,user:async()=>({firstName:'previous user'})});
 const loading=st.initialize();st.reset();gate.resolve([{id:'private-rental'}]);await loading;
 assert.equal(st.getSnapshot().userData,null);assert.deepEqual(st.getSnapshot().nextRentals,[]);
 assert.equal(st.getSnapshot().isLoading,true);
});
test('background reload failure keeps existing bookings and shows a recoverable warning',async()=>{
 let failed=false;const st=createRentalDataStore({dashboard:async()=>[null,null,[]],rentals:async()=>{if(failed)throw Error('Network unavailable');return [{id:'r1'}]},user:async()=>({})});
 await st.initialize();failed=true;await assert.rejects(st.loadRentals(),/Network unavailable/);
 assert.equal(st.getSnapshot().isLoading,false);assert.equal(st.getSnapshot().refreshError,'Network unavailable');
 assert.deepEqual(st.getSnapshot().nextRentals,[{id:'r1'}]);
});

test('a detached dashboard subscriber stops receiving account-scoped updates',async()=>{
 const store=createRentalDataStore(fake());
 let changes=0;
 const unsubscribe=store.subscribe(()=>changes++);
 await store.initialize();
 assert.ok(changes>0);
 const initialCount=changes;unsubscribe();
 store.resetError();store.reset();
 assert.equal(changes,initialCount,'unsubscribed view cannot consume newer session changes');
 assert.equal(store.getSnapshot().userData,null);
});
test('reset while a booking refresh is in flight prevents old-session bookings returning',async()=>{
 const gate=wait();let rentCalls=0;
 const store=createRentalDataStore({
  dashboard:async()=>[null,null],
  rentals:async()=>++rentCalls===1?[{id:'old'}]:gate.promise,
  user:async()=>({firstName:'Old user'})
 });
 await store.initialize();
 const refresh=store.loadRentals();assert.equal(store.getSnapshot().isRefreshing,true);
 store.reset();gate.resolve([{id:'private-after-signout'}]);await refresh;
 assert.equal(store.getSnapshot().isLoading,true);
 assert.equal(store.getSnapshot().refreshError,null);
 assert.deepEqual(store.getSnapshot().nextRentals,[]);
});
test('reset while background mutation reload is pending discards stale financial reports',async()=>{
 const dash=wait(),rent=wait();let loadCalls=0;
 const store=createRentalDataStore({
  dashboard:async()=>++loadCalls===1?[{totalRevenue:1},null]:dash.promise,
  rentals:async()=>loadCalls===1?[{id:'old'}]:rent.promise,
  user:async()=>({firstName:'prior'})
 });
 await store.initialize();
 const running=store.refreshAfterMutation();
 store.reset();
 dash.resolve([{totalRevenue:500000},null,[{label:'old-private-month'}]]);
 rent.resolve([{id:'private-stay'}]);
 await running;
 const state=store.getSnapshot();
 assert.equal(state.userData,null);
 assert.deepEqual(state.balances,[]);
 assert.deepEqual(state.nextRentals,[]);
 assert.equal(state.isLoading,true);
});
test('all failed balance and rental mutation refreshes are recoverable and never invent revenue',async()=>{
 let failed=false;
 const store=createRentalDataStore({
  dashboard:async()=>{if(failed)throw {status:500};return [{totalRevenue:100},null];},
  rentals:async()=>{if(failed)throw null;return [{id:'safe'}]},
  user:async()=>({firstName:'Owner'})
 });
 await store.initialize();failed=true;
 await store.refreshAfterMutation();
 assert.equal(store.getSnapshot().balances[0].totalRevenue,100);
 assert.deepEqual(store.getSnapshot().nextRentals,[{id:'safe'}]);
 assert.equal(store.getSnapshot().refreshError,'Unable to load rental data');
 assert.equal(store.getSnapshot().isRefreshing,false);
 store.resetError();assert.equal(store.getSnapshot().refreshError,null);
});
test('null initial load error uses safe message and numeric status defaults',async()=>{
 const store=createRentalDataStore({
  dashboard:async()=>[null,null],rentals:async()=>{throw null;},user:async()=>({})
 });
 await assert.rejects(store.initialize());
 assert.deepEqual(store.getSnapshot().loadingError,{
  message:'Unable to load rental data',status:0
 });
 assert.equal(store.getSnapshot().isLoading,false);
});
test('failed booking reload after account reset cannot install stale warning',async()=>{
 const gate=wait();let count=0;
 const store=createRentalDataStore({
  dashboard:async()=>[null,null],
  rentals:async()=>++count===1?[]:gate.promise,
  user:async()=>({firstName:'Previous'})
 });
 await store.initialize();
 const running=store.loadRentals();store.reset();
 gate.resolve(Promise.reject({message:'stale network error',status:503}));
 await assert.rejects(running);
 assert.equal(store.getSnapshot().refreshError,null);
 assert.equal(store.getSnapshot().isLoading,true);
});
