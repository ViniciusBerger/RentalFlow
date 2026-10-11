import { PgDialect } from 'drizzle-orm/pg-core';
import { DrizzleOrmRentalAdapter } from './drizzle-rental-adapter';
import { UpdateRentalUseCase } from '../../../../core/domain/rental/useCases/update-rental/update-rental.use-case';
import { CreateRentalUseCase } from '../../../../core/domain/rental/useCases/create-rental/create-rental.use-case';
import { PersistenceError } from '../../../../core/app/errors/persistence.error';

const dialect=new PgDialect();
const sqlFilter=(db:Record<string,jest.Mock>)=>dialect.sqlToQuery(db.where.mock.calls.at(-1)?.[0]);
const createDb=()=>{
  const db:any={};
  for(const name of ['select','from','where','limit','insert','values','returning','update','set','delete']) db[name]=jest.fn().mockReturnValue(db);
  return db;
};
const makeRepo=(db:any)=>new DrizzleOrmRentalAdapter(db);

describe('Booking owner authorization uses SQL-level host isolation',()=>{
 it('restricts UPDATE by both booking ID and authenticated host',async()=>{
   const db=createDb();db.where.mockResolvedValueOnce({rowCount:1});
   await expect(makeRepo(db).update('user-A','booking-X',{guests:3})).resolves.toBe(true);
   const filter=sqlFilter(db);expect(filter.sql).toContain('user_id');
   expect(filter.params).toEqual(expect.arrayContaining(['user-A','booking-X']));
 });
 it('cannot update a different host booking, even with a valid booking ID',async()=>{
   const db=createDb();db.where.mockResolvedValueOnce({rowCount:0});
   await expect(makeRepo(db).update('attacker','victim-booking',{revenue:1})).rejects.toBeInstanceOf(PersistenceError);
   const filter=sqlFilter(db);expect(filter.params).toContain('attacker');expect(filter.params).toContain('victim-booking');
 });
 it('restricts DELETE by user and booking together, rejecting non-owned IDs',async()=>{
   const db=createDb();db.where.mockResolvedValueOnce({rowCount:0});
   await expect(makeRepo(db).delete('user-A','other-user-booking')).rejects.toBeInstanceOf(PersistenceError);
   const filter=sqlFilter(db);expect(filter.sql).toContain('user_id');expect(filter.params).toContain('user-A');
 });
 it('scopes findOne by host, not merely by matching dates',async()=>{
   const db=createDb();db.where.mockResolvedValueOnce([]);
   await expect(makeRepo(db).findOne('user-A','2026-11-01','2026-11-03')).resolves.toBeNull();
   const filter=sqlFilter(db);expect(filter.sql).toContain('user_id');expect(filter.params).toContain('user-A');
 });
 it('allows two hosts to book the same dates and excludes inactive bookings from overlap checks',async()=>{
   const db=createDb();db.limit.mockResolvedValueOnce([]);
   await expect(makeRepo(db).checkOverlapDate('user-A','2026-11-01','2026-11-05')).resolves.toBe(false);
   const filter=sqlFilter(db);expect(filter.sql).toContain('user_id');expect(filter.sql).toContain('is_active');
   expect(filter.params).toContain('user-A');
 });
 it('recomputes profit in SQL when revenue or fee changes, never trusting stale client profit',async()=>{
   const db=createDb();db.where.mockResolvedValueOnce({rowCount:1});
   await makeRepo(db).update('host','booking',{revenue:450});
   const patch=db.set.mock.calls[0][0];
   const profit=dialect.sqlToQuery(patch.profit);
   expect(profit.sql).toContain('fee');expect(profit.params).toContain(450);
   expect(db.set).toHaveBeenCalledTimes(1);
 });
 it('recalculates profit when only fee changes or both fee and revenue change',async()=>{
   const db=createDb();db.where.mockResolvedValue({rowCount:1});
   const repo=makeRepo(db);await repo.update('host','a',{fee:100});
   let query=dialect.sqlToQuery(db.set.mock.calls[0][0].profit);
   expect(query.sql).toContain('total_revenue');expect(query.params).toContain(100);
   await repo.update('host','b',{revenue:200,fee:40});
   query=dialect.sqlToQuery(db.set.mock.calls[1][0].profit);
   expect(query.params).toEqual([200,40]);
 });
});

describe('Client edits cannot overwrite identity or trusted fields',()=>{
  const repo={update:jest.fn()};const useCase=new UpdateRentalUseCase(repo as any);
  beforeEach(()=>jest.clearAllMocks());
  it('permits legitimate fields while ignoring the old frontend profit value',async()=>{
    repo.update.mockResolvedValue(true);
    await expect(useCase.updateRental('host-A','booking-1',{guests:2,revenue:200,profit:5})).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalledWith('host-A','booking-1',{guests:2,revenue:200});
  });
  it.each(['userId','id','isActive','createdAt','role','__proto__'])('rejects protected field %s',async field=>{
    const input=Object.fromEntries([[field,'attacker']]);
    await expect(useCase.updateRental('host-A','booking-1',input)).rejects.toThrow('Invalid update fields');
    expect(repo.update).not.toHaveBeenCalled();
  });
  it('rejects missing, empty, only profit, or array patch bodies',async()=>{
    for(const body of [null,[],{}, {profit:0}])await expect(useCase.updateRental('host','x',body as any)).rejects.toThrow(/Invalid update/);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('Rental creation scopes availability per user',()=>{
  it('passes caller user ID to overlap predicate',async()=>{
    const repo:any={checkOverlapDate:jest.fn().mockResolvedValue(false), save:jest.fn().mockResolvedValue({userId:'host-A'})};
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00Z'));
    try {
      await new CreateRentalUseCase(repo).createRental('host-A','Ana','Silva','2026-11-01','2026-11-02',2,200,50);
      expect(repo.checkOverlapDate).toHaveBeenCalledWith('host-A','2026-11-01','2026-11-02',undefined);
    }finally{jest.useRealTimers();}
  });
});
