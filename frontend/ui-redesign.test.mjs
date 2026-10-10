import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL(`./src/${p}`,import.meta.url),'utf8');
test('workspace retains functional dashboard and bookings routes',()=>{ const routes=read('router.tsx');assert.match(routes,/dashboard/);assert.match(routes,/bookings/); });
test('create booking action is wired to existing modal',()=>{const shell=read('layout/index.tsx'); assert.match(shell,/onClick=\{handleOpenAddRental\}/);assert.match(shell,/<AddRentalPopUp/);});
test('booking editor and delete actions are preserved',()=>{const details=read('components/rental-detail-popup/index.tsx');assert.match(details,/onEditSubmit/);assert.match(details,/onDelete/);});
test('real financial metrics use BRL, not demo mockup values',()=>{const metrics=read('features/dashboard/main/components/balace-section/index.tsx');assert.match(metrics,/currency:"BRL"/);assert.match(metrics,/totalProfit/);assert.match(metrics,/totalRevenue/);});
test('mobile and desktop navigation use actual pages',()=>{for(const file of ['components/nav-bar/mobile-navbar/index.tsx','components/nav-bar/desktop-navbar/index.tsx']){const x=read(file);assert.match(x,/\/dashboard/);assert.match(x,/\/bookings/);}});
