import {BadRequestException,ConflictException} from '@nestjs/common';
import {cancellationQuote,validateAmendmentProposal,type ContractAmendmentInput} from './contract-changes';
const original:ContractAmendmentInput={
 startDate:'2027-03-01',endDate:'2027-03-05',
 propertyId:'33333333-3333-4333-8333-333333333333',guests:4,quotedTotalCents:40000,
 installments:[{agreedCents:10000,dueDate:'2027-02-01',paymentMethod:'PIX',isDeposit:true},
  {agreedCents:30000,dueEvent:'CHECKIN',paymentMethod:'BANK_TRANSFER',isDeposit:false}]
};
describe('contract changes proposals must revalidate their own totals',()=>{
 it('accepts correctly typed, balanced draft terms',()=>expect(()=>validateAmendmentProposal(original)).not.toThrow());
 it('rejects unbalanced and unsupported terms',()=>{
  expect(()=>validateAmendmentProposal({...original,quotedTotalCents:39000})).toThrow(BadRequestException);
  expect(()=>validateAmendmentProposal({...original,guests:0})).toThrow(BadRequestException);
  expect(()=>validateAmendmentProposal({...original,endDate:'2027-02-28'})).toThrow(BadRequestException);
  expect(()=>validateAmendmentProposal({...original,propertyId:'external'})).toThrow(BadRequestException);
  expect(()=>validateAmendmentProposal({...original,installments:[{
   ...original.installments[0],dueEvent:'CHECKIN'
  }]})).toThrow(BadRequestException);
  expect(()=>validateAmendmentProposal({...original,installments:[{
   ...original.installments[0],agreedCents:-1
  }]})).toThrow(BadRequestException);
 });
});
describe('cancellation quote is financially conservative',()=>{
 const policy={startDate:'2027-03-20',cancelledOn:'2027-02-01',cancelDays:30,
  paidCents:30000,agreedTotalCents:50000};
 it('calculates full refundable money within permitted window but does not assert transfer',()=>{
  expect(cancellationQuote(policy)).toMatchObject({
   refundDueCents:30000,paidCents:30000,deadlineMet:true,
   automaticTransferAvailable:false,refundState:'FULL_REFUND_DUE'
  });
 });
 it('does not invent penalty percentage when cancellation window has passed',()=>{
  expect(cancellationQuote({...policy,cancelledOn:'2027-03-12'})).toMatchObject({
   refundDueCents:null,retainedCents:null,refundState:'POLICY_REVIEW_REQUIRED'
  });
 });
 it('handles unpaid cancellations without fictitious transfers',()=>{
  expect(cancellationQuote({...policy,paidCents:0, cancelledOn:'2027-03-12'})).toMatchObject({
   refundDueCents:0,retainedCents:0,refundState:'NO_PAYMENT'
  });
 });
 it('rejects invalid accounting and already started reservations',()=>{
  expect(()=>cancellationQuote({...policy,paidCents:60000})).toThrow(BadRequestException);
  expect(()=>cancellationQuote({...policy,cancelledOn:'2027-03-21'})).toThrow(ConflictException);
 });
});
