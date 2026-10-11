import { ConflictException, NotFoundException } from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import { DrizzleOrmRentalAdapter } from './drizzle-rental-adapter';
import { Rental } from '../../../../core/domain/rental/entity/rental';
import { CreateRentalUseCase } from '../../../../core/domain/rental/useCases/create-rental/create-rental.use-case';
import { UpdateRentalUseCase } from '../../../../core/domain/rental/useCases/update-rental/update-rental.use-case';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dialect=new PgDialect();
const uuid='11111111-1111-4111-8111-111111111111';
function dbMock(){const db:any={};for(const name of ['select','from','where','limit','insert','values','returning','update','set','delete','groupBy','orderBy'])db[name]=jest.fn().mockReturnValue(db);return db;}
const sqlFilter=(db:any)=>dialect.sqlToQuery(db.where.mock.calls.at(-1)?.[0]);
const booking=()=>Rental.create({propertyId:uuid,userId:'host-A',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-01',endDate:'2026-11-03',guests:2,revenue:250,fee:50,profit:200});

describe('Property-level booking isolation and availability',()=>{
 it('inserts only when the property is active and owned by requesting account',async()=>{
  const db=dbMock();db.where.mockResolvedValueOnce([{id:uuid}]);db.returning.mockResolvedValueOnce([{userId:'host-A',profit:200}]);
  await expect(new DrizzleOrmRentalAdapter(db).save(booking())).resolves.toMatchObject({profit:200});
  const where=dialect.sqlToQuery(db.where.mock.calls[0][0]);
  expect(where.params).toEqual(expect.arrayContaining([uuid,'host-A',true]));
  expect(db.values.mock.calls[0][0].propertyId).toBe(uuid);
 });
 it('refuses properties belonging to another account before any rental INSERT',async()=>{
  const db=dbMock();db.where.mockResolvedValueOnce([]);
  await expect(new DrizzleOrmRentalAdapter(db).save(booking())).rejects.toBeInstanceOf(NotFoundException);
  expect(db.insert).not.toHaveBeenCalled();
 });
 it('refuses booking updates that move to an inactive or other-account property',async()=>{
  const db=dbMock();db.where.mockResolvedValueOnce([]);
  await expect(new DrizzleOrmRentalAdapter(db).update('host-A','booking-A',{propertyId:uuid})).rejects.toBeInstanceOf(NotFoundException);
  expect(db.update).not.toHaveBeenCalled();
 });
 it('allows changing property if the new property belongs to the authenticated host',async()=>{
  const db=dbMock();db.where.mockResolvedValueOnce([{id:uuid}]).mockResolvedValueOnce({rowCount:1});
  await expect(new DrizzleOrmRentalAdapter(db).update('host-A','booking-A',{propertyId:uuid})).resolves.toBe(true);
  expect(db.set.mock.calls[0][0].propertyId).toBe(uuid);
 });
 it('conflicts are filtered by property ID so properties can share dates',async()=>{
  const db=dbMock();db.limit.mockResolvedValueOnce([]);
  await expect(new DrizzleOrmRentalAdapter(db).checkOverlapDate('host-A','2026-11-01','2026-11-03',uuid)).resolves.toBe(false);
  const filter=sqlFilter(db);expect(filter.sql).toContain('property_id');expect(filter.params).toContain(uuid);expect(filter.params).toContain('host-A');
 });
 it('supports per-property monthly and yearly financial filters',async()=>{
  const db=dbMock();db.orderBy.mockResolvedValue([]);
  const repo=new DrizzleOrmRentalAdapter(db);
  await repo.getMonthlyBalanceCurrentYear('host-A',uuid);
  let query=dialect.sqlToQuery(db.where.mock.calls.at(-1)[0]);expect(query.sql).toContain('property_id');expect(query.params).toContain(uuid);
  await repo.getYearlyBalanceCurrentYear('host-A',uuid);
  query=dialect.sqlToQuery(db.where.mock.calls.at(-1)[0]);expect(query.sql).toContain('property_id');expect(query.params).toContain(uuid);
 });
 it('maps concurrent exclusion constraint violations to HTTP 409 instead of a 500',async()=>{
  const db=dbMock();db.where.mockResolvedValue([{id:uuid}]);db.returning.mockRejectedValueOnce({code:'23P01'});
  await expect(new DrizzleOrmRentalAdapter(db).save(booking())).rejects.toBeInstanceOf(ConflictException);
 });
 it('rejects property foreign key violations without revealing other account data',async()=>{
  const db=dbMock();db.where.mockResolvedValue([{id:uuid}]);db.returning.mockRejectedValueOnce({cause:{code:'23503'}});
  await expect(new DrizzleOrmRentalAdapter(db).save(booking())).rejects.toBeInstanceOf(NotFoundException);
 });
 it('propagates storage errors instead of falsely confirming a booking',async()=>{
  const db=dbMock();db.where.mockResolvedValue([{id:uuid}]);db.returning.mockRejectedValueOnce(Error('DB offline'));
  await expect(new DrizzleOrmRentalAdapter(db).save(booking())).rejects.toThrow('DB offline');
 });
 it('enforces property-scoped SQL for update and database concurrency',async()=>{
  const db=dbMock();db.where.mockResolvedValueOnce([{id:uuid}]).mockRejectedValueOnce({code:'23P01'});
  await expect(new DrizzleOrmRentalAdapter(db).update('host-A','booking-A',{propertyId:uuid})).rejects.toBeInstanceOf(ConflictException);
 });
 it('sends selected property ID through creation use case and overlap check',async()=>{
  const repo:any={checkOverlapDate:jest.fn().mockResolvedValue(false),save:jest.fn().mockResolvedValue({id:'booked'})};
  jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00Z'));
  try{await new CreateRentalUseCase(repo).createRental('host-A','Ana','Silva','2026-11-01','2026-11-03',2,250,50,uuid);
   expect(repo.checkOverlapDate).toHaveBeenCalledWith('host-A','2026-11-01','2026-11-03',uuid);
   expect(repo.save.mock.calls[0][0].propertyId).toBe(uuid);
  }finally{jest.useRealTimers();}
 });
 it('ordinary edits allow propertyId but not tenant or status mutation',async()=>{
  const repo:any={update:jest.fn().mockResolvedValue(true)};
  const useCase=new UpdateRentalUseCase(repo);
  await useCase.updateRental('host-A','booking',{propertyId:uuid});expect(repo.update).toHaveBeenCalledWith('host-A','booking',{propertyId:uuid});
  await expect(useCase.updateRental('host-A','booking',{userId:'attacker'})).rejects.toThrow('Invalid update fields');
 });
});

describe('Migration safety contract',()=>{
 const sqlText=readFileSync(join(process.cwd(),'drizzle/0003_properties_and_scoped_bookings.sql'),'utf8');
 it('assigns a unique default property to each existing account',()=>{
  expect(sqlText).toMatch(/Imóvel principal/);expect(sqlText).toMatch(/SELECT "firebase_uid"/);
  expect(sqlText).toMatch(/UPDATE "rentals" AS r SET "property_id"/);expect(sqlText).toMatch(/ALTER COLUMN "property_id" SET NOT NULL/);
 });
 it('protects account-property relationships with a composite database FK',()=>{
  expect(sqlText).toMatch(/FOREIGN KEY \("property_id","user_id"\)/);
  expect(sqlText).toMatch(/"properties"\("id","user_id"\)/);
 });
 it('prevents only same-property date overlaps, using checkout-exclusive ranges',()=>{
  expect(sqlText).toMatch(/EXCLUDE USING gist \("property_id" WITH =, daterange\("start_date","end_date",'\[\)'\) WITH &&\)/);
  expect(sqlText).toContain('WHERE ("is_active" = true)');
 });
});
