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
});