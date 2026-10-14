const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
process.env.VITE_API_URL='http://localhost:3000';
require('./register-typescript.cjs');
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const {getBookingQuote}=require('../src/hooks/rental-actions/rental-service.ts');
const oldFetch=global.fetch;
const quoteInput={propertyId:'11111111-1111-4111-8111-111111111111',startDate:'2027-02-01',endDate:'2027-02-02',guests:2,revenue:500,guestFee:{mode:'AUTOMATIC'}};
const valid={baseCents:50000,calculatedExtraCents:0,chargedExtraCents:0,totalCents:50000,guests:2,nights:1};
afterEach(()=>{global.fetch=oldFetch;clearCsrfToken();});
function respond(payload,status=200){
 const calls=[];
 global.fetch=async(url,init)=>{calls.push({url:String(url),init});
  if(String(url).endsWith('/auth/csrf'))return {ok:true,status:200,json:async()=>({csrfToken:'verified'})};
  return {ok:status>=200&&status<300,status,json:async()=>payload};
 };
 return calls;
}
test('quote uses backend result and authenticated CSRF request, never trusts client amount',async()=>{
 const calls=respond(valid);
 assert.deepEqual(await getBookingQuote(quoteInput),valid);
 const request=calls.find(x=>x.url.endsWith('/rental/quote'));
 assert.ok(request);
 assert.equal(request.init.method,'POST');
 assert.equal(request.init.headers.get('X-CSRF-Token'),'verified');
 assert.deepEqual(JSON.parse(request.init.body),quoteInput);
});
test('quote surfaces server validation error',async()=>{
 respond({message:'A capacidade máxima foi excedida.'},400);
 await assert.rejects(getBookingQuote(quoteInput),/A capacidade máxima foi excedida/);
});
test('quote falls back when server error body lacks message',async()=>{
 respond({},503);
 await assert.rejects(getBookingQuote(quoteInput),/Unable to obtain a rental price quote/);
});
test('quote rejects invalid server-calculated totals instead of creating a booking',async()=>{
 for(const payload of [null,{...valid,totalCents:-1},{...valid,totalCents:0.25},
 {...valid,chargedExtraCents:-1},{...valid,calculatedExtraCents:0.3},
 {...valid,baseCents:NaN}]){
  respond(payload);
  await assert.rejects(getBookingQuote(quoteInput),/Invalid price quote response/);
  clearCsrfToken();
 }
});
