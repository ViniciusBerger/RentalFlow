import { CreateRentalUseCase } from './create-rental.use-case';
import { IRentalRepository } from 'src/core/app/ports/IRentalRepository';
import { Rental } from '../../entity/rental';

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
      clientFirstName: 'John',
      clientLastName: 'Doe',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      guests: 10,
      revenue: 500, 
      fee: 250,
      profit: 250
    };

    it('should successfully create a rental when data is valid and dates are free', async () => {
      // GIVEN: The repository says the dates are NOT overlapping and the repository returns the saved rental object
      repository.checkOverlapDate.mockResolvedValue(false); 
      const expectedRental = Rental.create(validData)
      repository.save.mockResolvedValue(expectedRental); 

      // WHEN: We execute the use case
      const result = await useCase.createRental(
        validData.clientFirstName,
        validData.clientLastName,
        validData.startDate,
        validData.endDate,
        validData.guests,
        validData.revenue,
        validData.fee,
      );

      // THEN: Check the result and repository calls
      expect(result).toBeInstanceOf(Rental);
      expect(result.clientFirstName).toBe(validData.clientFirstName);
      expect(repository.checkOverlapDate).toHaveBeenCalledWith(validData.startDate, validData.endDate);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw "Date already booked." when repository detects an overlap', async () => {
      // GIVEN: The repository detects a conflict
      repository.checkOverlapDate.mockResolvedValue(true);

      // WHEN & THEN: It should reject before saving
      await expect(
        useCase.createRental(
          validData.clientFirstName,
          validData.clientLastName,
          validData.startDate,
          validData.endDate,
          validData.guests,
          validData.revenue,
          validData.fee,
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
          validData.clientFirstName,
          validData.clientLastName,
          invalidDates.start,
          invalidDates.end,
          validData.guests,
          validData.revenue,
          validData.fee,
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