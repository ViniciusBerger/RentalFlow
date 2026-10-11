import {rentalCharge,verifyInstallments,validateBrazilianCpf,verifyGuestFinalization} from './contract-validation';
describe('server-side rental contract calculations',()=>{
 const p={included:10, maximum:12, extraRateCents:25000};
 it('calculates extra guest fee, waiver and manual adjustment',()=>{
  expect(rentalCharge(200000,12,2,p,{mode:'AUTOMATIC'},false)).toEqual({calculatedExtraCents:100000,chargedExtraCents:100000,totalCents:300000});
  expect(rentalCharge(200000,12,2,p,{mode:'WAIVED',reason:'Approved promotion'},true).totalCents).toBe(200000);
  expect(rentalCharge(200000,12,2,p,{mode:'ADJUSTED',cents:75000,reason:'Host discount'},true).totalCents).toBe(275000);
 });
 it('rejects overcapacity, fabricated overrides, negatives and fractional cents',()=>{
  expect(()=>rentalCharge(200000,13,2,p,{mode:'AUTOMATIC'},true)).toThrow();
  expect(()=>rentalCharge(200000,12,2,p,{mode:'WAIVED',reason:'discount'},false)).toThrow();
  expect(()=>rentalCharge(200000,12,2,p,{mode:'ADJUSTED',cents:-1,reason:'x'},true)).toThrow();
  expect(()=>rentalCharge(1.3,11,2,p,{mode:'AUTOMATIC'},false)).toThrow();
 });
 it('enforces cent-exact installment sum',()=>{
  expect(()=>verifyInstallments(10000,[3300,3300,3400])).not.toThrow();
  expect(()=>verifyInstallments(10000,[5000,4000])).toThrow();
  expect(()=>verifyInstallments(10000,[5000,5000.1])).toThrow();
 });
 it('validates Brazilian CPF check digits, and refuses incomplete guests',()=>{
  expect(validateBrazilianCpf('529.982.247-25')).toBe(true);
  expect(validateBrazilianCpf('111.111.111-11')).toBe(false);
  expect(()=>verifyGuestFinalization({fullName:'Ana Silva',cpf:'52998224725',rg:'12345678',nationality:'BR',maritalStatus:'SOLTEIRO',address:'Rua das Flores, 120',phone:'27999998888',email:'ana@example.test'})).not.toThrow();
  expect(()=>verifyGuestFinalization({fullName:'Ana',cpf:'11111111111',rg:'',nationality:'US',maritalStatus:'SOLTEIRO',address:'x',phone:'',email:'bad'})).toThrow();
 });
});
