import {canCancelBeforeCheckIn} from './cancellation-cutoff';
describe('landlord cancellation cutoff at Brazil local check-in',()=>{
 const start='2026-10-13',check='15:00:00';
 it('allows a future stay or same-day before check-in',()=>{
  expect(canCancelBeforeCheckIn(start,check,new Date('2026-10-13T17:59:59Z'))).toBe(true);
  expect(canCancelBeforeCheckIn('2026-10-14',check,new Date('2026-10-13T18:00:00Z'))).toBe(true);
 });
 it('blocks exact check-in instant and any time thereafter including finished stays',()=>{
  expect(canCancelBeforeCheckIn(start,check,new Date('2026-10-13T18:00:00Z'))).toBe(false);
  expect(canCancelBeforeCheckIn(start,check,new Date('2026-10-14T00:00:00Z'))).toBe(false);
  expect(canCancelBeforeCheckIn('2026-10-12',check,new Date('2026-10-13T12:00:00Z'))).toBe(false);
 });
 it('fails closed for missing or malformed property check-in settings and dates',()=>{
  for(const bad of [null,undefined,'','invalid','99:99','24:00:00']){
   expect(canCancelBeforeCheckIn(start,bad,new Date('2026-10-13T17:00:00Z'))).toBe(false);
  }
  expect(canCancelBeforeCheckIn('not-a-date',check,new Date())).toBe(false);
  expect(canCancelBeforeCheckIn(start,check,new Date(NaN))).toBe(false);
 });
 it('accepts HH:mm format and respects São Paulo rather than server timezone',()=>{
  expect(canCancelBeforeCheckIn(start,'15:00',new Date('2026-10-13T17:59:59Z'))).toBe(true);
  expect(canCancelBeforeCheckIn(start,'15:00',new Date('2026-10-13T18:00:00Z'))).toBe(false);
 });
});
