import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL(`./src/${p}`,import.meta.url),'utf8');
test('workspace retains functional dashboard and bookings routes',()=>{ const routes=read('router.tsx');assert.match(routes,/dashboard/);assert.match(routes,/bookings/); });
test('create booking action is wired to existing modal',()=>{const shell=read('layout/index.tsx'); assert.match(shell,/onClick=\{handleOpenAddRental\}/);assert.match(shell,/<AddRentalPopUp/);});
test('booking editor and delete actions are preserved',()=>{const details=read('components/rental-detail-popup/index.tsx');assert.match(details,/onEditSubmit/);assert.match(details,/onDelete/);});
test('financial metrics use real balance values and the Brazilian reais formatter', () => {
  const metrics = read('features/dashboard/main/components/balace-section/index.tsx');
  const formatters = read('i18n/messages.ts');

  // Component uses actual backend-provided revenue/profit, not static example amounts.
  assert.match(metrics, /props\.yearly\?\.totalRevenue/);
  assert.match(metrics, /props\.yearly\?\.totalProfit/);
  assert.match(metrics, /props\.monthly\?\.totalRevenue/);
  assert.match(metrics, /props\.monthly\?\.totalProfit/);
  assert.match(metrics, /formatBRL\(item\.value\)/);

  // BRL configuration lives in the shared i18n formatter after localization.
  assert.match(formatters, /toLocaleString\(['"]pt-BR['"],\s*\{\s*style:\s*['"]currency['"],\s*currency:\s*['"]BRL['"]/);
  assert.doesNotMatch(metrics, /\bUSD\b/);
});
test('mobile and desktop navigation use actual pages',()=>{for(const file of ['components/nav-bar/mobile-navbar/index.tsx','components/nav-bar/desktop-navbar/index.tsx']){const x=read(file);assert.match(x,/\/dashboard/);assert.match(x,/\/bookings/);}});
