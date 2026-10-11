import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleOrmRentalAdapter } from './drizzle-rental-adapter';
import { DRIZZLE } from '../../../persistence/database.module';
import { Rental } from '../../../../core/domain/rental/entity/rental';
import { PersistenceError } from '../../../../core/app/errors/persistence.error';
import { PgDialect } from 'drizzle-orm/pg-core';

describe('DrizzleOrmAdapter', () => {
  let adapter: DrizzleOrmRentalAdapter;
  let dbMock: any;

  const createRentalRow = (overrides = {}) => ({
    id: '1',
    userId: 'testid123456',
    clientFirstName: 'firstname',
    clientLastName: 'lastname',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    guests: 15,
    revenue: 100,
    fee: 50,
    profit: 50,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    dbMock = {
      update: jest.fn(),
      set: jest.fn(),
      where: jest.fn(),
      insert: jest.fn(),
      values: jest.fn(),
      returning: jest.fn(),
      delete: jest.fn(),
      select: jest.fn(),
      from: jest.fn(),
      limit: jest.fn(),
      groupBy: jest.fn(),
      orderBy: jest.fn(),
    };

    dbMock.update.mockReturnValue(dbMock);
    dbMock.set.mockReturnValue(dbMock);
    dbMock.where.mockReturnValue(dbMock);
    dbMock.insert.mockReturnValue(dbMock);
    dbMock.values.mockReturnValue(dbMock);
    dbMock.delete.mockReturnValue(dbMock);
    dbMock.select.mockReturnValue(dbMock);
    dbMock.from.mockReturnValue(dbMock);
    dbMock.limit.mockReturnValue(dbMock);
    dbMock.groupBy.mockReturnValue(dbMock);
    dbMock.orderBy.mockReturnValue(dbMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrizzleOrmRentalAdapter,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
      ],
    }).compile();

    adapter = module.get<DrizzleOrmRentalAdapter>(DrizzleOrmRentalAdapter);
  });

  describe('update', () => {
    it('should return true if rows were affected', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 1 });

      const result = await adapter.update('host-1','id', { revenue: 100 });

      expect(result).toBe(true);
    });

    it('should throw PersistenceError if no rows were affected', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 0 });

      await expect(adapter.update('host-1','id', { revenue: 100 })).rejects.toThrow(
        PersistenceError,
      );
    });
  });

  describe('save', () => {
    const mockRental = new Rental({
      userId: 'testid123456',
      clientFirstName: 'firstname',
      clientLastName: 'lastname',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      guests: 15,
      revenue: 100,
      fee: 50,
      profit: 50,
      isActive: true,
    });

    it('should return the partial saved data on success', async () => {
      const dbReturn = {
        clientFirstName: 'firstname',
        clientLastName: 'lastname',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      };

      dbMock.returning.mockResolvedValue([dbReturn]);

      const result = await adapter.save(mockRental);

      expect(result).toEqual(dbReturn);
    });

    it('should throw PersistenceError if insert fails', async () => {
      dbMock.returning.mockResolvedValue([]);

      await expect(adapter.save(mockRental)).rejects.toThrow(PersistenceError);
    });
  });

  describe('delete', () => {
    it('should return true on successful deletion', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 1 });

      const result = await adapter.delete('host-1','id');

      expect(result).toBe(true);
    });

    it('should throw PersistenceError if ID not found', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 0 });

      await expect(adapter.delete('host-1','id')).rejects.toThrow(PersistenceError);
    });
  });

  describe('findAll', () => {
    it('should return a mapped list of Rental entities', async () => {
      const userId = 'testid123456';

      const rentalRows = [
        createRentalRow({ id: '1', startDate: '2026-01-01' }),
        createRentalRow({ id: '2', startDate: '2026-02-01' }),
      ];

      dbMock.orderBy.mockResolvedValue(rentalRows);

      const result = await adapter.findAll(userId);

      expect(result).toHaveLength(rentalRows.length);
      expect(result[0]).toBeInstanceOf(Rental);
      expect(dbMock.orderBy).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return null if no rental found', async () => {
      dbMock.where.mockResolvedValue([]);

      const result = await adapter.findOne('host-1','start', 'end');

      expect(result).toBeNull();
    });

    it('should return Rental entity if found', async () => {
      const dbRow = createRentalRow({
        id: '1',
        startDate: 'S',
        endDate: 'E',
        revenue: 1,
      });

      dbMock.where.mockResolvedValue([dbRow]);

      const result = await adapter.findOne('host-1','S', 'E');

      expect(result).toBeInstanceOf(Rental);
    });
  });

  describe('findNextThree', () => {
    it('should return mapped rentals if found', async () => {
      const dbRows = [
        createRentalRow({
          id: '1',
          userId: 'testid123456',
          startDate: '2026-05-01',
        }),
        createRentalRow({
          id: '2',
          userId: 'testid123456',
          startDate: '2026-06-01',
        }),
      ];

      dbMock.limit.mockResolvedValue(dbRows);

      const result = await adapter.findNextThree('testid123456');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Rental);
      expect(dbMock.orderBy).toHaveBeenCalledTimes(1);
      expect(dbMock.limit).toHaveBeenCalledWith(3);
      // A booking from earlier this year must not be returned as 'upcoming'.
      const queryFilter = dbMock.where.mock.calls[0][0];
      // Read only SQL's literal chunks (not circular Drizzle table metadata).
      const literals = (node: unknown): string => {
        if (!node || typeof node !== 'object') return '';
        if (Array.isArray(node)) return node.map(literals).join(' ');
        if ('queryChunks' in node && Array.isArray(node.queryChunks)) return literals(node.queryChunks);
        if ('value' in node && Array.isArray(node.value)) return node.value.filter((x): x is string => typeof x === 'string').join(' ');
        return '';
      };
      const sqlFragments = literals(queryFilter);
      expect(sqlFragments).toContain('CURRENT_DATE');
      expect(dbMock.where).toHaveBeenCalledTimes(1);
      const query = new PgDialect().sqlToQuery(queryFilter);
      expect(query.sql).toContain('user_id');
      expect(query.params).toContain('testid123456');
      expect(sqlFragments).not.toContain("DATE_TRUNC('year'");
    });

    it('should return an empty list if no rentals are found', async () => {
      dbMock.limit.mockResolvedValue([]);

      await expect(adapter.findNextThree('testid123456')).resolves.toEqual([]);
    });
  });

  describe('checkOverlapDate', () => {
    it('should return true if overlap found', async () => {
      dbMock.limit.mockResolvedValue([{ id: '1' }]);

      const result = await adapter.checkOverlapDate('host-1','S', 'E');

      expect(result).toBe(true);
    });

    it('should return false if no overlap found', async () => {
      dbMock.limit.mockResolvedValue([]);

      const result = await adapter.checkOverlapDate('host-1','S', 'E');

      expect(result).toBe(false);
    });
  });

  describe('getMonthlyBalanceCurrentYear', () => {
    it('should return a list of monthly balance objects', async () => {
      const userId = '1001';

      const mockData = [
        {
          label: '2026-01',
          totalRevenue: 5000,
          totalProfit: 2000,
        },
      ];

      dbMock.orderBy.mockResolvedValue(mockData);

      const result = await adapter.getMonthlyBalanceCurrentYear(userId);

      expect(result).toEqual(mockData);
      const queryFilter = dbMock.where.mock.calls[0][0];
      const dialect = new PgDialect();
      const filter = dialect.sqlToQuery(queryFilter);
      expect(filter.sql).toMatch(/DATE_TRUNC.*year/);
      expect(filter.sql).toContain('INTERVAL \'1 year\'');
      expect(filter.params).toContain(userId);
      const selection = dbMock.select.mock.calls[0][0];
      expect(dialect.sqlToQuery(selection.bookingCount).sql).toContain('COUNT(*)::int');
    });
  });

  describe('getYearlyBalanceCurrentYear', () => {
    it('should return yearly balance', async () => {
      const userId = '1001';

      const mockData = [
        {
          label: '2026',
          totalRevenue: 10000,
          totalProfit: 4000,
        },
      ];

      dbMock.orderBy.mockResolvedValue(mockData);

      const result = await adapter.getYearlyBalanceCurrentYear(userId);

      expect(result).toEqual(mockData);
    });
  });
});