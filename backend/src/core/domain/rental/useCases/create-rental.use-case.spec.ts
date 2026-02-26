import { CreateRentalUseCase } from './create-rental.use-case';
import { IRentalRepository } from 'src/core/app/ports/IRentalRepository';
import { Rental } from '../entitiy/rental';

describe('CreateRentalUseCase', () => {
  let useCase: CreateRentalUseCase;
  let repository: jest.Mocked<IRentalRepository>;

  beforeEach(() => {
    // 1. Create a mock of the repository
    repository = {
      save: jest.fn(),
      checkOverlapDate: jest.fn(),
      // Add other methods from IRentalRepository if necessary
    } as any;

    useCase = new CreateRentalUseCase(repository);
  });

  describe('createRental', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      start: '2026-03-01',
      end: '2026-03-05',
      guests: 10,
      revenue: 500, 
      fee: 250,
      profit: 250
    };

    it('should successfully create a rental when data is valid and dates are free', async () => {
      // GIVEN: The repository says the dates are NOT overlapping
      repository.checkOverlapDate.mockResolvedValue(false);
      
      // GIVEN: The repository returns the saved rental object
      const expectedRental = new Rental(
        validData.firstName,
        validData.lastName,
        validData.start,
        validData.end,
        validData.guests,
        validData.revenue,
        validData.fee,
        validData.profit,

      );
      repository.save.mockResolvedValue(expectedRental);

      // WHEN: We execute the use case
      const result = await useCase.createRental(
        validData.firstName,
        validData.lastName,
        validData.start,
        validData.end,
        validData.guests,
        validData.revenue,
        validData.fee,
        validData.profit,
      );

      // THEN: Check the result and repository calls
      expect(result).toBeInstanceOf(Rental);
      expect(result.clientFirstName).toBe(validData.firstName);
      expect(repository.checkOverlapDate).toHaveBeenCalledWith(validData.start, validData.end);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw "Date already booked." when repository detects an overlap', async () => {
      // GIVEN: The repository detects a conflict
      repository.checkOverlapDate.mockResolvedValue(true);

      // WHEN & THEN: It should reject before saving
      await expect(
        useCase.createRental(
          validData.firstName,
          validData.lastName,
          validData.start,
          validData.end,
          validData.guests,
          validData.revenue,
          validData.fee,
          validData.profit,
        )
      ).rejects.toThrow('Date already booked.');

      // Ensure save was NEVER called
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw "End date must be after start date" when end date is before start date', async () => {
      // GIVEN: Dates are free
      repository.checkOverlapDate.mockResolvedValue(false);

      const invalidDates = {
        start: '2026-03-10',
        end: '2026-03-01', // End is before start
      };

      // WHEN & THEN:
      await expect(
        useCase.createRental(
          validData.firstName,
          validData.lastName,
          invalidDates.start,
          invalidDates.end,
          validData.guests,
          validData.revenue,
          validData.fee,
          validData.profit,
        )
      ).rejects.toThrow('End date must be after start date');
    });

    it('should throw "End date must be after start date" when dates are identical', async () => {
      // GIVEN: Dates are free
      repository.checkOverlapDate.mockResolvedValue(false);

      const sameDate = '2026-03-01';

      // WHEN & THEN:
      await expect(
        useCase.createRental(
          validData.firstName,
          validData.lastName,
          sameDate,
          sameDate,
          validData.guests,
          validData.revenue,
          validData.fee,
          validData.profit,
        )
      ).rejects.toThrow('End date must be after start date');
    });
  });
});