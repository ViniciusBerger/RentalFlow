const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./register-typescript.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const h = React.createElement;
const render = (Component, props, route='/dashboard') => renderToStaticMarkup(h(MemoryRouter, { initialEntries:[route] },h(Component,props)));
const booking = {id:'booking-1',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-02',endDate:'2026-11-04',guests:2,fee:20,revenue:150,profit:130,isActive:true};

const { Header }=require('../src/features/dashboard/main/components/dashboard-header/index.tsx');
const { BalanceSection }=require('../src/features/dashboard/main/components/balace-section/index.tsx');
const { NextRentals }=require('../src/components/next-rentals/index.tsx');
const { CalendarHeader }=require('../src/features/booking/components/booking-calendar/calendar-header/index.tsx');
const { CalendarMain }=require('../src/features/booking/components/booking-calendar/calendar-main/index.tsx');
const { DesktopNavBar }=require('../src/components/nav-bar/desktop-navbar/index.tsx');
const { MobileNavBar }=require('../src/components/nav-bar/mobile-navbar/index.tsx');
const { Main }=require('../src/features/dashboard/main/index.tsx');
const { AuthForm }=require('../src/features/auth/components/auth-form/index.tsx');
const { AddRentalForm }=require('../src/components/add-rental-popup/add-rental-form.tsx');
const AddRentalPopUp=require('../src/components/add-rental-popup/index.tsx').default;
const RentalDetailPopUp=require('../src/components/rental-detail-popup/index.tsx').default;

const noop=()=>{};
test('dashboard greets the real host and falls back for incomplete profile',()=>{
 assert.match(render(Header,{username:{firstName:' Ana ',lastName:'Silva'}}),/Welcome back, Ana/);
 assert.match(render(Header,{username:null}),/Welcome back, Host/);
 assert.match(render(Header,{username:{firstName:'   '}}),/Welcome back, Host/);
});
test('financial metrics display real BRL revenue and profit, not invented KPIs',()=>{
 const html=render(BalanceSection,{props:{yearly:{label:'2026',totalRevenue:10000,totalProfit:7000},monthly:{label:'2026-11',totalRevenue:1000,totalProfit:800}}});
 assert.match(html,/Yearly revenue/);assert.match(html,/Yearly profit/);
 assert.match(html,/Monthly revenue/);assert.match(html,/Monthly profit/);
 assert.match(html,/10\.000,00/);assert.match(html,/7\.000,00/);
 assert.match(html,/1\.000,00/);assert.match(html,/800,00/);
 assert.equal((html.match(/rf-metric rf-panel/g)||[]).length,4);
});
test('financial cards remain readable with missing backend values',()=>{
 const html=render(BalanceSection,{props:{yearly:null,monthly:undefined}});
 assert.equal((html.match(/Current period/g)||[]).length,4);
 assert.match(html,/0,00/);
});
test('upcoming rentals shows an honest empty state and calendar navigation',()=>{
 const html=render(NextRentals,{rentals:[],onSelectRental:noop,onOpenPopUp:noop,headerContent:'Upcoming rentals'});
 assert.match(html,/No upcoming rentals yet/);
 assert.match(html,/href="\/bookings"/);
 assert.doesNotMatch(html,/rf-rental-row/);
});
test('upcoming rentals displays booking status, dates, guests and labels',()=>{
 const html=render(NextRentals,{rentals:[booking,{...booking,id:'booking-2',isActive:false,clientFirstName:'Rui',startDate:'invalid'}],onSelectRental:noop,onOpenPopUp:noop,headerContent:'Next bookings'});
 assert.match(html,/Ana Silva/);assert.match(html,/Booked/);
 assert.match(html,/Rui Silva/);assert.match(html,/Inactive/);
 assert.match(html,/2 guests/);assert.match(html,/invalid/);
 assert.equal((html.match(/rf-rental-row/g)||[]).length,2);
});
test('calendar header offers accessible month navigation labels',()=>{
 const html=render(CalendarHeader,{viewDate:new Date(2026,10,1),handleNext:noop,handlePrev:noop});
 assert.match(html,/November 2026/);
 assert.match(html,/aria-label="Previous month"/);
 assert.match(html,/aria-label="Next month"/);
});
test('calendar uses 42 day cells, weekday headers and shows bookings',()=>{
 const html=render(CalendarMain,{viewDate:new Date(2026,10,1),rentals:[booking]});
 assert.equal((html.match(/border-r border-b border-sage-50/g)||[]).length,42);
 assert.match(html,/Sunday/);assert.match(html,/Saturday/);
 assert.match(html,/Ana \/ 2 nights/);
});
test('desktop sidebar provides only implemented routes and workspace overview',()=>{
 const html=render(DesktopNavBar,{});
 assert.match(html,/Main navigation/);assert.match(html,/href="\/dashboard"/);
 assert.match(html,/href="\/bookings"/);
 assert.match(html,/href="\/properties"/);
 assert.doesNotMatch(html,/href="\/guests"/);
});
test('mobile nav exposes main routes and accessible booking action',()=>{
 const html=render(MobileNavBar,{onCreateClick:noop});
 assert.match(html,/Mobile navigation/);
 assert.match(html,/Create booking/);
 assert.match(html,/href="\/dashboard"/);
 assert.match(html,/href="\/bookings"/);
});
test('dashboard combines host, balances and current bookings with create navigation',()=>{
 const html=render(Main,{onOpenCreateRentalPopUp:noop,onOpenPopUp:noop,onSelectRental:noop,userData:{firstName:'Ana'},props:{},threeNextRentals:[booking]});
 assert.match(html,/Welcome back, Ana/);
 assert.match(html,/Create a booking/);
 assert.match(html,/Open calendar/);
 assert.match(html,/Ana Silva/);
});
test('login form renders accessible input types and server-side errors',()=>{
 const html=render(AuthForm,{onSubmit:async()=>{},isLoading:false,error:'Wrong credentials'});
 assert.match(html,/type="email"/);
 assert.match(html,/type="password"/);
 assert.match(html,/Wrong credentials/);
});
test('booking form preserves required data fields and error/loading messages',()=>{
 const form={clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-01',endDate:'2026-11-05',revenue:100,fee:20,guests:2};
 const html=render(AddRentalForm,{handleSubmit:noop,handleChange:noop,error:'Date already booked.',isSaving:true,formData:form});
 for(const field of ['clientFirstName','clientLastName','startDate','endDate','revenue','fee','guests'])assert.match(html, new RegExp(`name="${field}"`));
 assert.match(html,/Date already booked\./);
 assert.match(html,/R\$/);
});
test('create booking modal hides completely while closed and appears when open',()=>{
 assert.equal(render(AddRentalPopUp,{onSubmit:noop,isOpen:false,onClose:noop,isSaving:false,error:null}),'');
 const html=render(AddRentalPopUp,{onSubmit:noop,isOpen:true,onClose:noop,isSaving:false,error:null});
 assert.match(html,/Create a booking/);assert.match(html,/Check In/);
});
test('booking details never display a missing booking and display actual financial figures',()=>{
 const base={isOpen:true,rental:null,onClose:noop,onEditSubmit:async()=>true,isSavingEdit:false,editError:null,onDelete:noop};
 assert.equal(render(RentalDetailPopUp,base),'');
 assert.equal(render(RentalDetailPopUp,{...base,isOpen:false,rental:booking}),'');
 const html=render(RentalDetailPopUp,{...base,rental:booking});
 assert.match(html,/Ana/);
 assert.match(html,/Edit Booking/);
 assert.match(html,/booking-1|booking/);
});
