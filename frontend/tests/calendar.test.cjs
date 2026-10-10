const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./register-typescript.cjs');
const { calendarDisplay, normalizeRentalDates, buildRentalDiff } = require('../src/features/booking/service/calendar-service.tsx');

const rental = (data={}) => ({ id: 'booking-1', clientFirstName:'João', clientLastName:'Costa', startDate:'2026-11-02', endDate:'2026-11-05', guests:2, ...data });

test('normalizes ISO date-only strings to local midnight, without UTC date shifting', () => {
 const date = normalizeRentalDates(rental({startDate: '2026-03-08',endDate:'2026-03-10'}));
 assert.equal(date.startDate.getFullYear(),2026);
 assert.equal(date.startDate.getMonth(),2);
 assert.equal(date.startDate.getDate(),8);
 assert.equal(date.startDate.getHours(),0);
 assert.equal(date.endDate.getDate(),10);
});
test('normalizes Date input without mutating the original instance or booking',()=>{
 const dt=new Date('2026-05-05T20:15:00'); const b=rental({startDate:dt,endDate:dt});
 const normalized=normalizeRentalDates(b);
 assert.equal(normalized.startDate.getHours(),0);
 assert.equal(dt.getHours(),20);
 assert.notEqual(normalized,b);
});
test('diff omits unchanged booking fields and retains changed values, including false and zero',()=>{
 const original={id:'r1',guests:2,fee:40,isActive:true};
 assert.deepEqual(buildRentalDiff(original, {guests:2,fee:0,isActive:false}), {fee:0,isActive:false});
 assert.deepEqual(buildRentalDiff(original,{guests:2}),{});
});
test('calendar displays inclusive stay span and correct nights',()=>{
 const cells=calendarDisplay([normalizeRentalDates(rental())],new Date(2026,10,1));
 assert.equal(cells.length,1);
 assert.match(cells[0].props.children.props.children,/João \/ 3 nights/);
 assert.equal(cells[0].props.style.gridColumn,'2 / span 4');
});
test('calendar splits rentals across week boundaries',()=>{
 const booking=normalizeRentalDates(rental({startDate:'2026-11-06',endDate:'2026-11-10'}));
 const cells=calendarDisplay([booking],new Date(2026,10,1));
 assert.equal(cells.length,2);
 assert.equal(cells[0].props.style.gridColumn,'6 / span 2');
 assert.equal(cells[1].props.style.gridColumn,'1 / span 3');
});
test('calendar renders no cells for an empty rental list',()=>{
 assert.deepEqual(calendarDisplay([],new Date(2026,10,1)),[]);
});
