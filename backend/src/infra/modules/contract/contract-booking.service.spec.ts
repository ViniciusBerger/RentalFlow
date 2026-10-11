import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import {ContractBookingService,checkedNights} from './contract-booking.service';

const propertyId='11111111-1111-4111-8111-111111111111';
const rentalId='22222222-2222-4222-8222-222222222222';
const contractId='33333333-3333-4333-8333-333333333333';
const key='44444444-4444-4444-8444-444444444444';
const guest={cpf:'529.982.247-25',rg:'123456789',phone:'+5527999999999'};
const payload=()=>({
 propertyId,clientFirstName:'Ana',clientLastName:'Silva',
 startDate:'2026-12-01',endDate:'2026-12-03',
 guests:3,revenue:200,fee:20,
 bookingDraft:{requestKey:key,baseRevenueCents:20000,confirmedTotalCents:21000,guest,
  guestFee:{mode:'AUTOMATIC'},paymentMethod:'PIX',paymentDueEvent:'KEY_HANDOVER'}
});
function mockDatabase(answers:any[]) {
 const recorded:any[]=[];
 const next=jest.fn(async()=>answers.shift()??[]);
 const tx:any={
  execute:jest.fn().mockResolvedValue([]),
  select:jest.fn(()=>({
   from:()=>({where:()=>({
    limit:next,orderBy:()=>({limit:next})
   })})
  })),
  insert:jest.fn(()=>({values:(data:any)=>{
   recorded.push(data);
   return {returning:async()=>[
    'propertyId' in data?{...data,id:rentalId}:{id:contractId}
   ]};
  }})),
  update:jest.fn(()=>({set:()=>({where:jest.fn().mockResolvedValue([])})}))
 };
 const db:any={transaction:jest.fn(cb=>cb(tx))};
 return {db,tx,recorded};
}

describe('Atomic contract booking',()=>{
 const previous={...process.env};
 beforeEach(()=>{
  process.env.CONTRACT_DATA_KEYS=JSON.stringify({v1:Buffer.alloc(32,17).toString('base64')});
  process.env.CONTRACT_ACTIVE_KEY_VERSION='v1';
  jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00Z'));
 });
 afterEach(()=>{process.env={...previous};jest.useRealTimers();});

 it('rejects invalid calendar dates before touching storage',async()=>{
  expect(()=>checkedNights('2026-02-30','2026-03-03')).toThrow(BadRequestException);
  expect(()=>checkedNights('2026-12-04','2026-12-01')).toThrow(BadRequestException);
  expect(()=>checkedNights('2026-10-10','2026-10-12')).toThrow(BadRequestException);
  expect(checkedNights('2026-12-01','2026-12-03')).toBe(2);
 });
 it('rejects ambiguous base price and unapproved override without DB writes',async()=>{
  const {db}=mockDatabase([]);
  await expect(new ContractBookingService(db).create('owner-a',{...payload(),revenue:200.001} as any))
   .rejects.toBeInstanceOf(BadRequestException);
  await expect(new ContractBookingService(db).create('owner-a',{
   ...payload(),bookingDraft:{...payload().bookingDraft,baseRevenueCents:20001}
  } as any)).rejects.toBeInstanceOf(BadRequestException);
  expect(db.transaction).not.toHaveBeenCalled();
 });
 it('uses Brazil calendar date rather than UTC for same-day bookings',()=>{
  jest.setSystemTime(new Date('2026-10-12T02:30:00Z')); // Oct 11 in São Paulo
  expect(checkedNights('2026-10-11','2026-10-12')).toBe(1);
  expect(()=>checkedNights('2026-10-10','2026-10-12')).toThrow(BadRequestException);
 });
 it('quotes the final amount from account-owned occupancy settings',async()=>{
  const {db}=mockDatabase([[{id:propertyId}],
    [{includedOccupancy:2,maximumOccupancy:4,extraGuestRateCents:500}]]);
  const price=await new ContractBookingService(db).quote('owner-a',{
    propertyId,startDate:'2026-12-01',endDate:'2026-12-03',
    guests:3,revenue:200,guestFee:{mode:'AUTOMATIC'}
  });
  expect(price).toMatchObject({baseCents:20000,calculatedExtraCents:1000,
    chargedExtraCents:1000,totalCents:21000,nights:2});
 });
 it('requires a new price review if the confirmed total differs from current backend pricing',async()=>{
  const {db,recorded}=mockDatabase([[],[{id:propertyId}],
    [{includedOccupancy:2,maximumOccupancy:4,extraGuestRateCents:500}]]);
  await expect(new ContractBookingService(db).create('owner-a',{
    ...payload(),bookingDraft:{...payload().bookingDraft,confirmedTotalCents:20000}
  } as any)).rejects.toBeInstanceOf(ConflictException);
  expect(recorded).toHaveLength(0);
 });
 it('requires property ownership, never writes to a different account',async()=>{
  const {db,recorded}=mockDatabase([[],[]]);
  await expect(new ContractBookingService(db).create('owner-a',payload() as any))
   .rejects.toBeInstanceOf(NotFoundException);
  expect(recorded).toHaveLength(0);
 });
 it('calculates surcharge on server, seals guest and price provenance and makes draft',async()=>{
  const policy={includedOccupancy:2,maximumOccupancy:4,extraGuestRateCents:500};
  const {db,tx,recorded}=mockDatabase([[],[{id:propertyId}],[policy],[]]);
  const result=await new ContractBookingService(db).create('owner-a',payload() as any);
  expect(result).toMatchObject({contractStatus:'DRAFT',totalCents:21000,
   chargedExtraCents:1000,contractId,revenue:210,profit:190});
  const booking=recorded.find(r=>r?.propertyId===propertyId);
  expect(booking).toMatchObject({userId:'owner-a',guests:3,revenue:210,fee:20,profit:190});
  const revision=recorded.find(r=>r?.status==='DRAFT'&&r?.snapshotCiphertext);
  expect(revision).toMatchObject({contractId,userId:'owner-a',versionNumber:1});
  expect(Buffer.isBuffer(revision.snapshotCiphertext)).toBe(true);
  expect(JSON.stringify(revision)).not.toContain(guest.cpf);
  const identity=recorded.find(r=>r?.identityCiphertext);
  expect(identity.userId).toBe('owner-a');
  expect(JSON.stringify(identity)).not.toContain(guest.rg);
  const schedule=recorded.find(r=>Array.isArray(r));
  expect(schedule![0]).toMatchObject({agreedCents:21000,receivedCents:0,
   paymentMethod:'PIX',dueEvent:'KEY_HANDOVER'});
  expect(tx.execute).toHaveBeenCalledTimes(1);
  expect(db.transaction).toHaveBeenCalledTimes(1);
 });
 it('requires a justification to waive the calculated surcharge',async()=>{
  const {db,recorded}=mockDatabase([[],[{id:propertyId}],
   [{includedOccupancy:2,maximumOccupancy:4,extraGuestRateCents:500}]]);
  await expect(new ContractBookingService(db).create('owner-a',{
   ...payload(),bookingDraft:{...payload().bookingDraft,guestFee:{mode:'WAIVED',reason:''}}
  } as any)).rejects.toBeInstanceOf(BadRequestException);
  expect(recorded).toHaveLength(0);
 });
 it('refuses a payment schedule that does not equal the final server total',async()=>{
  const {db,recorded}=mockDatabase([[],[{id:propertyId}],
   [{includedOccupancy:2,maximumOccupancy:4,extraGuestRateCents:500}]]);
  await expect(new ContractBookingService(db).create('owner-a',{
   ...payload(),bookingDraft:{...payload().bookingDraft,
    installments:[{agreedCents:20000,paymentMethod:'PIX'}]}
  } as any)).rejects.toBeInstanceOf(BadRequestException);
  expect(recorded).toHaveLength(0);
 });
 it('idempotently replays the same booking, but never creates another record',async()=>{
  const {db,recorded}=mockDatabase([
   [], // first call replaced below by stable HMAC stored after a normal transaction
   [{id:propertyId}], [{includedOccupancy:2,maximumOccupancy:4,extraGuestRateCents:500}], []
  ]);
  const service=new ContractBookingService(db);
  await service.create('owner-a',payload() as any);
  const stored=recorded.find(r=>r?.operation==='CREATE_BOOKING_CONTRACT');
  const {db:replay,recorded:duplicates}=mockDatabase([
   [{...stored,status:'COMPLETED',resourceId:rentalId}],
   [{...payload(),id:rentalId,userId:'owner-a',revenue:210,profit:190}],
   [{id:contractId}]
  ]);
  const result=await new ContractBookingService(replay).create('owner-a',payload() as any);
  expect(result.contractId).toBe(contractId);
  expect(duplicates).toHaveLength(0);
  const modified=payload();modified.clientFirstName='Different';
  const {db:rejected}=mockDatabase([[{...stored,status:'COMPLETED',resourceId:rentalId}]]);
  await expect(new ContractBookingService(rejected).create('owner-a',modified as any))
   .rejects.toBeInstanceOf(ConflictException);
 });
});
