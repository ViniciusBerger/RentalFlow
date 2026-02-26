import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleOrmAdapter } from '../adapters/drizzle-orm-adapter';
import { DRIZZLE } from '../persistence/database.module';
import { Rental } from '../../../src/core/domain/rental/entitiy/rental';

describe('DrizzleOrmAdapter', () => {
  let adapter: DrizzleOrmAdapter;
  let dbMock: any;

  beforeEach(async () => {
    // We create a complex mock to handle Drizzle's chaining syntax
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrizzleOrmAdapter,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
      ],
    }).compile();

    adapter = module.get<DrizzleOrmAdapter>(DrizzleOrmAdapter);
  });

  describe('update', () => {
    it('should return true if rows were affected', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 1 });
      const result = await adapter.update('id', { revenue: 100 });
      expect(result).toBe(true);
    });

    it('should return false if no rows were affected', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 0 });
      const result = await adapter.update('id', { revenue: 100 });
      expect(result).toBe(false);
    });
  });

  describe('save', () => {
    it('should return the saved rental on success', async () => {
      const mockData = new Rental('Vinicius', 'Berger', '2026-01-01', '2026-01-02', 100);
      dbMock.returning.mockResolvedValue([mockData]);

      const result = await adapter.save(mockData);
      expect(result).toEqual(mockData);
    });

    it('should throw error if insert fails', async () => {
      dbMock.returning.mockResolvedValue([]);
      const mockData = new Rental('V', 'B', '2026', '2026', 10);
      
      await expect(adapter.save(mockData)).rejects.toThrow("saving data to database failed");
    });
  });

  describe('delete', () => {
    it('should return true on successful deletion', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 1 });
      expect(await adapter.delete('id')).toBe(true);
    });

    it('should return false if ID not found', async () => {
      dbMock.where.mockResolvedValue({ rowCount: 0 });
      expect(await adapter.delete('id')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return a mapped list of Rental entities', async () => {
      const dbRows = [
        { clientFirstName: 'A', clientLastName: 'B', startDate: 'S', endDate: 'E', revenue: 1, id: '1', createdAt: new Date() }
      ];
      dbMock.from.mockResolvedValue(dbRows);

      const result = await adapter.getAll();
      expect(result[0]).toBeInstanceOf(Rental);
      expect(result[0].clientFirstName).toBe('A');
    });
  });

  describe('findOne', () => {
    it('should return null if no rental found', async () => {
      dbMock.where.mockResolvedValue([]);
      const result = await adapter.findOne('start', 'end');
      expect(result).toBeNull();
    });

    it('should return Rental entity if found', async () => {
      const dbRow = { clientFirstName: 'A', clientLastName: 'B', startDate: 'S', endDate: 'E', revenue: 1, id: '1', createdAt: new Date() };
      dbMock.where.mockResolvedValue([dbRow]);

      const result = await adapter.findOne('S', 'E');
      expect(result).toBeInstanceOf(Rental);
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

  describe('getMonthlyRevenueCurrentYear', () => {
    it('should return a list of monthly revenue objects', async () => {
      const mockMonthlyData = [
        { month_label: '2026-01', totalRevenue: 5000 },
        { month_label: '2026-02', totalRevenue: 3000 },
      ];

      // In Drizzle's chain, the last method (orderBy) is the one that resolves the promise
      dbMock.orderBy.mockResolvedValue(mockMonthlyData);

      const result = await adapter.getMonthlyBalanceCurrentYear();

      expect(result).toEqual(mockMonthlyData);
      expect(dbMock.select).toHaveBeenCalled();
      expect(dbMock.where).toHaveBeenCalled();
      expect(dbMock.groupBy).toHaveBeenCalled();
    });

    it('should return an empty array if no revenue exists for the current year', async () => {
      dbMock.orderBy.mockResolvedValue([]);
      
      const result = await adapter.getMonthlyBalanceCurrentYear();
      
      expect(result).toEqual([]);
    });
  });

  describe('getYearlyRevenueCurrentYear', () => {
    it('should return an array with the current year total', async () => {
      const mockYearlyData = [
        { label: '2026', totalRevenue: 8000 }
      ];

      dbMock.orderBy.mockResolvedValue(mockYearlyData);

      const result = await adapter.getYearlyBalanceCurrentYear();

      expect(result).toEqual(mockYearlyData);
      expect(result[0].label).toBe('2026');
      expect(dbMock.groupBy).toHaveBeenCalled();
    });

    it('should convert DB sums to numbers via the repository logic', async () => {
      // This tests that our mock returns what the mapWith(Number) would produce
      const mockYearlyData = [{ label: '2026', totalRevenue: 150.50 }];
      dbMock.orderBy.mockResolvedValue(mockYearlyData);

      const result = await adapter.getYearlyBalanceCurrentYear();

      expect(typeof result[0].totalRevenue).toBe('number');
      expect(result[0].totalRevenue).toBe(150.50);
    });
  });
});