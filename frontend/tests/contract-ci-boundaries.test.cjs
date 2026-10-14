const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {csrfFetch,clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const {buildRentalInsights}=require('../src/features/dashboard/monthly-insights.ts');
const originalFetch=global.fetch;
afterEach(()=>{global.fetch=originalFetch;clearCsrfToken();});

test('legacy backend CSRF 404 does not invent a token, but keeps credentialed write settings',async()=>{
 clearCsrfToken();
 const calls=[];
 global.fetch=async(url,options={})=>{
  calls.push({url:String(url),options});
  return String(url).endsWith('/auth/csrf')?{status:404,ok:false}:{status:200,ok:true};
 };
 await csrfFetch('/owner-only',{method:'POST',headers:{'Content-Type':'application/json'}});
 assert.equal(calls.length,2);
 assert.equal(calls[0].options.cache,'no-store');
 assert.equal(calls[0].options.credentials,'include');
 assert.equal(calls[1].options.credentials,'include');
 assert.equal(calls[1].options.cache,'no-store');
 assert.equal(calls[1].options.headers.get('X-CSRF-Token'),null);
 assert.equal(calls[1].options.headers.get('Content-Type'),'application/json');
});
test('session denial and server outage block mutating requests; never silently fall back',async()=>{
 for(const status of [401,403,500,503]){
  clearCsrfToken();let calls=0;
  global.fetch=async()=>{calls++;return {status,ok:false}};
  await assert.rejects(csrfFetch('/contracts/workspace/test/cancel',{method:'POST'}),
   /Unable to validate session/);
  assert.equal(calls,1,'the protected write was never dispatched');
 }
});
test('invalid CSRF response shapes cannot supply a forged token and allow retry',async()=>{
 for(const payload of [null,0,{},[],{csrfToken:null},{csrfToken:123}]){
  clearCsrfToken();let dispatched=0;
  global.fetch=async(url)=>{
   if(String(url).endsWith('/auth/csrf'))return {ok:true,status:200,json:async()=>payload};
   dispatched++;return {ok:true,status:200};
  };
  await assert.rejects(csrfFetch('/contracts/workspace/test/amend',{method:'POST'}),
   /Invalid session verification response/);
  assert.equal(dispatched,0);
 }
 clearCsrfToken();let checked=0;
 global.fetch=async(url,options)=>{
  if(String(url).endsWith('/auth/csrf')){checked++;return {ok:true,status:200,json:async()=>({csrfToken:'server-verified'})}};
  assert.equal(options.headers.get('X-CSRF-Token'),'server-verified');
  return {ok:true,status:204};
 };
 await csrfFetch('/contracts/workspace/test/amend',{method:'POST'});
 assert.equal(checked,1,'a rejected CSRF response is not permanently cached');
});
test('concurrent protected writes share the server-issued token and cached token',async()=>{
 clearCsrfToken();let verifies=0,writes=0;
 global.fetch=async(url,options)=>{
  if(String(url).endsWith('/auth/csrf')){verifies++;
   await Promise.resolve();return {ok:true,status:200,json:async()=>({csrfToken:'trusted'})};
  }
  writes++;assert.equal(options.headers.get('X-CSRF-Token'),'trusted');
  return {ok:true,status:200};
 };
 await Promise.all([csrfFetch('/amend',{method:'POST'}),csrfFetch('/cancel',{method:'POST'})]);
 await csrfFetch('/save',{method:'PATCH'});
 assert.equal(verifies,1);assert.equal(writes,3);
});
test('monthly insights ignore future and partial months, and break ties chronologically',()=>{
 const rows=[
  {label:'2026-01',bookingCount:3,totalRevenue:1250,totalProfit:850},
  {label:'2026-02',bookingCount:3,totalRevenue:990,totalProfit:600},
  {label:'2026-10',bookingCount:999,totalRevenue:999999,totalProfit:900000},
  {label:'2026-12',bookingCount:999,totalRevenue:999999,totalProfit:900000}
 ];
 const result=buildRentalInsights(rows,'2026-10-13');
 assert.equal(result.months.length,12);
 assert.equal(result.strongest.label,'2026-01');
 assert.equal(result.weakest.label,'2026-03');
 assert.equal(result.months[9].isComplete,false);
 assert.equal(result.months[9].bookingCount,999);
 assert.equal(result.months[1].totalProfit,600);
 assert.equal(result.months[2].totalRevenue,0);
});
test('missing/invalid current dates or no completed booking history cannot imply a seasonal peak',()=>{
 for(const today of ['not-a-date','2026-00-12','2026-13-13','2026-01-01']){
  const result=buildRentalInsights([{label:'2026-01',bookingCount:9}],today);
  assert.equal(result.strongest,null);
  assert.equal(result.weakest,null);
  assert.equal(result.months.some(x=>x.isComplete),false);
 }
 const rows=[{label:'2026-01',bookingCount:-4,totalRevenue:0,totalProfit:0},
  {label:'2026-02',totalRevenue:100,totalProfit:20}];
 const result=buildRentalInsights(rows,'2026-06-15');
 assert.equal(result.strongest,null);
 assert.equal(result.weakest,null);
 assert.equal(result.months[0].bookingCount,0);
 assert.equal(result.months[1].bookingCount,0);
});
