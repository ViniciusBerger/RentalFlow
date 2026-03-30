import { CreateRentalUseCase } from './create-rental.use-case';
import { IRentalRepository } from 'src/core/app/ports/IRentalRepository';
import { Rental } from '../../entity/rental';

describe('CreateRentalUseCase', () => {
  let useCase: CreateRentalUseCase;
  let repository: jest.Mocked<IRentalRepository>;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      checkOverlapDate: jest.fn(),
    } as any;

    useCase = new CreateRentalUseCase(repository);
  });

  describe('createRental', () => {
    const validData = {
      userId: 'testid123',
      clientFirstName: 'Joao',
      clientLastName: 'Vinicius',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      guests: 10,
      revenue: 500,
      fee: 250,
      profit: 250,
    };

    it('should successfully create a rental when data is valid and dates are free', async () => {
      repository.checkOverlapDate.mockResolvedValue(false);

      const expectedRental = Rental.create(validData);
      repository.save.mockResolvedValue(expectedRental);

      const result = await useCase.createRental(
        validData.userId,
        validData.clientFirstName,
        validData.clientLastName,
        validData.startDate,
        validData.endDate,
        validData.guests,
        validData.revenue,
        validData.fee
      );

      expect(result).toBeInstanceOf(Rental);
      expect(result.userId).toBe(validData.userId);
      expect(repository.checkOverlapDate).toHaveBeenCalledWith(
        validData.startDate,
        validData.endDate
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw "Date already booked." when repository detects an overlap', async () => {
      repository.checkOverlapDate.mockResolvedValue(true);

      await expect(
        useCase.createRental(
          validData.userId,
          validData.clientFirstName,
          validData.clientLastName,
          validData.startDate,
          validData.endDate,
          validData.guests,
          validData.revenue,
          validData.fee
        )
      ).rejects.toThrow('Date already booked.');

      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw "End date must be after start date" when end date is before start date', async () => {
      repository.checkOverlapDate.mockResolvedValue(false);

      const invalidDates = {
        start: '2026-03-10',
        end: '2026-03-01',
      };

      await expect(
        useCase.createRental(
          validData.userId,
          validData.clientFirstName,
          validData.clientLastName,
          invalidDates.start,
          invalidDates.end,
          validData.guests,
          validData.revenue,
          validData.fee
        )
      ).rejects.toThrow('End date must be after start date');
    });

    it('should throw "End date must be after start date" when dates are identical', async () => {
      repository.checkOverlapDate.mockResolvedValue(false);

      const sameDate = '2026-03-01';

      await expect(
        useCase.createRental(
          validData.userId,
          validData.clientFirstName,
          validData.clientLastName,
          sameDate,
          sameDate,
          validData.guests,
          validData.revenue,
          validData.fee
        )
      ).rejects.toThrow('End date must be after start date');
    });
  });
});