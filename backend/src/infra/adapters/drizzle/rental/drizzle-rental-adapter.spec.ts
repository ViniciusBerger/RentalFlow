import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleOrmRentalAdapter } from './drizzle-rental-adapter';
import { DRIZZLE } from '../../../persistence/database.module';
import { Rental } from '../../../../core/domain/rental/entity/rental';
import { PersistenceError } from '../../../../core/app/errors/persistence.error';

describe('DrizzleOrmAdapter', () => {
  let adapter: DrizzleOrmRentalAdapter;
  let dbMock: any;

  beforeEach(async () => {
    dbMock = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      delete: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      //then: jest.fn((resolve) => resolve([])),
    };

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
      const result = await adapter.update('id', { revenue: 100 });
      expect(result).toBe(true);
    });

    it('should throw PersistenceError if no rows were affected', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 0 });
      await expect(adapter.update('id', { revenue: 100 })).rejects.toThrow(PersistenceError);
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
      isActive: true
    });

    it('should return the partial saved data on success', async () => {
      const dbReturn = {
        clientFirstName: 'firstname',
        clientLastName: 'lastname',
        startDate: '2026-01-01',
        endDate: '2026-01-02'
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
      expect(await adapter.delete('id')).toBe(true);
    });

    it('should throw PersistenceError if ID not found', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 0 });
      await expect(adapter.delete('id')).rejects.toThrow(PersistenceError);
    });
  });

  describe('findAll', () => {
    it('should return a mapped list of Rental entities', async () => {
      const dbRows = [
        {userId: "testid123456", startDate: 'S', endDate: 'E', revenue: 1, id: '1', createdAt: new Date() }
      ];

      dbMock.from.mockReturnThis();
      dbMock.where.mockResolvedValue(dbRows);

      const result = await adapter.findAll("testid123456");
      expect(result[0]).toBeInstanceOf(Rental);
      expect(result[0].startDate).toBe('S');
    });
  });

  describe('findOne', () => {
    it('should return null if no rental found', async () => {
      dbMock.where.mockResolvedValue([]);
      const result = await adapter.findOne('start', 'end');
      expect(result).toBeNull();
    });

    it('should return Rental entity if found', async () => {
      const dbRow = { userId: 'testid123456', startDate: 'S', endDate: 'E', revenue: 1, id: '1', createdAt: new Date() };
      dbMock.where.mockResolvedValue([dbRow]);

      const result = await adapter.findOne('S', 'E');
      expect(result).toBeInstanceOf(Rental);
    });
  });

  describe('findNextThree', () => {
    it('should return mapped rentals if found', async () => {
      const dbRows = [
        { userId: 'testid123456', id: '1', startDate: '2026-05-01' },
        { userId: 'testid123457', id: '2', startDate: '2026-06-01' }
      ];
      dbMock.limit.mockResolvedValue(dbRows);

      const result = await adapter.findNextThree();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Rental);
    });

    it('should throw PersistenceError if no rentals are found', async () => {
      dbMock.limit.mockResolvedValue([]);
      await expect(adapter.findNextThree()).rejects.toThrow(PersistenceError);
    });
  });

  describe('checkOverlapDate', () => {
    it('should return true if overlap found', async () => {
      dbMock.limit.mockResolvedValue([{ id: '1' }]);
      expect(await adapter.checkOverlapDate('S', 'E')).toBe(true);
    });

    it('should return false if no overlap found', async () => {
      dbMock.limit.mockResolvedValue([]);
      expect(await adapter.checkOverlapDate('S', 'E')).toBe(false);
    });
  });

  describe('getMonthlyBalanceCurrentYear', () => {
    it('should return a list of monthly balance objects', async () => {
      const mockData = [
        { month_label: '2026-01', totalRevenue: 5000, totalProfit: 2000 },
      ];
      dbMock.orderBy.mockResolvedValue(mockData);

      const result = await adapter.getMonthlyBalanceCurrentYear();
      expect(result).toEqual(mockData);
    });
  });

  describe('getYearlyBalanceCurrentYear', () => {
    it('should return yearly balance', async () => {
      const mockData = [{ year_label: '2026', totalRevenue: 10000, totalProfit: 4000 }];
      dbMock.orderBy.mockResolvedValue(mockData);

      const result = await adapter.getYearlyBalanceCurrentYear();
      expect(result).toEqual(mockData);
    });
  });
});