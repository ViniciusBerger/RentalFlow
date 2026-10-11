const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
require('./register-typescript.cjs');
process.env.VITE_API_URL='http://localhost:3000';
const { login, getMe, completeProfile, logout }=require('../src/hooks/auth/auth-service.tsx');
const { addRental, deleteRental, updateRental }=require('../src/hooks/rental-actions/rental-service.ts');
const { loadNextRentals, loadUserData, loadDashboardBalance }=require('../src/hooks/load-data/load-data.service.ts');
const { loadBalance }=require('../src/hooks/load-data/balance-service.ts');
afterEach(()=>{delete global.fetch});
function respond(status,body){return {ok:status>=200&&status<300,status,json:async()=>body};}
function track(...results){const calls=[];global.fetch=async (url,options)=>{calls.push([url,options]);let next=results.shift();if(next instanceof Error)throw next;return next;};return calls;}

test('login sends development credentials as JSON with session cookies', async()=>{
 const calls=track(respond(200,{message:'Development login successful'}));
 assert.equal((await login('test@test.com','test123')).message,'Development login successful');
 assert.equal(calls[0][0],'http://localhost:3000/auth/login');
 assert.equal(calls[0][1].credentials,'include');
 assert.equal(calls[0][1].method,'POST');
 assert.deepEqual(JSON.parse(calls[0][1].body),{email:'test@test.com',password:'test123'});
});
test('login propagates status and sanitized backend messages on 401',async()=>{
 track(respond(401,{message:'Invalid development credentials'}));
 await assert.rejects(login('test@test.com','wrong'),e=>e.status===401&&e.message==='Invalid development credentials');
});
test('login gracefully handles an error response that is not JSON',async()=>{
 track({ok:false,status:503,json:async()=>{throw new Error('non-JSON')}});
 await assert.rejects(login('a','b'),e=>e.status===503&&e.message==='Unable to login');
});
test('getMe requests the cookie-authenticated session and propagates errors',async()=>{
 const calls=track(respond(200,{uid:'host-1'}),respond(401,{message:'Expired'}));
 assert.deepEqual(await getMe(),{uid:'host-1'});
 await assert.rejects(getMe(),e=>e.status===401&&e.message==='Expired');
 assert.equal(calls[0][1].method,'GET'); assert.equal(calls[0][1].credentials,'include');
});
test('completeProfile writes only profile fields and propagates validation errors',async()=>{
 const calls=track(respond(200,true), respond(400,{message:'First name required'}));
 assert.equal(await completeProfile({firstName:'A',lastName:'B'}),true);
 assert.deepEqual(JSON.parse(calls[0][1].body),{firstName:'A',lastName:'B'});
 await assert.rejects(completeProfile({firstName:'',lastName:'B'}),e=>e.status===400);
});
test('logout uses cookie credentials and reports HTTP failure',async()=>{
 const calls=track(respond(200,{message:'Logged out successfully'}), respond(500,{}));
 assert.equal((await logout()).message,'Logged out successfully');
 await assert.rejects(logout(),/Logout failed/);
 assert.equal(calls[0][1].credentials,'include');
});
test('create booking serializes the submitted fields and checks error status',async()=>{
 const calls=track(respond(201,{id:'b1'}),respond(409,{message:'Date already booked.'}));
 const payload={startDate:'2026-11-10',endDate:'2026-11-12',guests:3};
 assert.equal((await addRental(payload)).status,201);
 assert.deepEqual(JSON.parse(calls[0][1].body),payload);
 assert.equal(calls[0][1].credentials,'include');
 await assert.rejects(addRental(payload),e=>e.status===409);
});
test('delete booking returns API boolean and never turns HTTP failure into success',async()=>{
 const spy=console.error;console.error=()=>{};
 try{
 const calls=track(respond(200,true),respond(200,false),respond(404,{message:'Not found'}));
 assert.equal(await deleteRental('r-1'),true);
 assert.equal(await deleteRental('r-2'),false);
 await assert.rejects(deleteRental('r-3'),e=>e.status===404&&e.message==='Not found');
 assert.equal(calls[0][1].method,'DELETE');assert.match(calls[0][0],/\/rental\/delete\/r-1$/);
 } finally{console.error=spy;}
});
test('update booking sends a patch and handles positive/negative results',async()=>{
 const spy=console.error;console.error=()=>{};
 try{
 const calls=track(respond(200,true),respond(200,false),respond(422,{message:'Invalid update'}));
 assert.equal(await updateRental('r-1',{fee:30}),true);
 assert.equal(await updateRental('r-2',{fee:30}),false);
 await assert.rejects(updateRental('r-3',{fee:-1}),e=>e.status===422 && e.message==='Invalid update');
 assert.deepEqual(JSON.parse(calls[0][1].body),{id:'r-1',toBeUpdated:{fee:30}});
 }finally{console.error=spy;}
});
test('upcoming rentals and authenticated host data use their correct API endpoints',async()=>{
 const calls=track(respond(200,[{id:'r1'}]),respond(200,{firebaseUid:'host-1'}));
 assert.deepEqual(await loadNextRentals(),[{id:'r1'}]);
 assert.equal((await loadUserData()).firebaseUid,'host-1');
 assert.match(calls[0][0],/\/rental\/findall$/);
 assert.match(calls[1][0],/\/user\/host$/);
});
test('upcoming and host loading propagate server errors',async()=>{
 track(respond(500,{message:'Rentals unavailable'}),respond(403,{message:'Not onboarded'}));
 await assert.rejects(loadNextRentals(),e=>e.status===500);
 await assert.rejects(loadUserData(),e=>e.status===403);
});
test('balance loads annual and monthly financial summaries in their UI order',async()=>{
 const calls=track(respond(200,[{label:'2026',totalRevenue:800,totalProfit:500}]),respond(200,[{label:'2026-11',totalRevenue:100,totalProfit:60}]));
 const [year,month,series]=await loadDashboardBalance();
 assert.equal(year.totalRevenue,800);
 assert.deepEqual(series,[{label:'2026-11',totalRevenue:100,totalProfit:60}]);
 // The current-month card is NOT the first arbitrary month.
 assert.equal(month?.label === '2026-11', require('../src/features/booking/service/booking-timeline.ts').brazilToday().slice(0,7)==='2026-11');
 assert.match(calls[0][0],/\/balance\/yearly$/);
 assert.match(calls[1][0],/\/balance\/monthly$/);
});
test('balance errors stop loading and do not show partial financial totals',async()=>{
 const calls=track(respond(401,{message:'No session'}),respond(200,[]));
 await assert.rejects(loadBalance(),e=>e.status===401);
 assert.equal(calls.length,2);
});
test('balance requests default to missing data safely',async()=>{
 track(respond(200,[]),respond(200,[]));
 assert.deepEqual(await loadBalance(),[undefined,undefined,[]]);
});
