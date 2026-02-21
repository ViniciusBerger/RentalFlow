import { FindRentalUseCase } from './find-rental.use-case';
import { Rental } from '../entitiy/rental';
import { IRentalRepository } from '../../../app/ports/IRentalRepository';

describe('FindRentalUseCase (Pure Unit Test)', () => {
  let useCase: FindRentalUseCase;
  let repository: jest.Mocked<IRentalRepository>;

  beforeEach(() => {
    //Manually create the mock object
    repository = {
      findOne: jest.fn(),
    } as any;

    // Instantiate the Use Case by passing the mock directly
    // This ensures 'rentalRepository' is never undefined
    useCase = new FindRentalUseCase(repository);
  });

  describe('findOne', () => {
    const startDate = '2026-05-01';
    const endDate = '2026-05-10';

    it('should return a rental when valid dates are provided and a record exists', async () => {
      // GIVEN
      const mockRental = new Rental('Vinicius', 'Berger', startDate, endDate, 1000);
      repository.findOne.mockResolvedValue(mockRental);

      // WHEN
      const result = await useCase.findOne(startDate, endDate);

      // THEN
      expect(result).toEqual(mockRental);
      expect(repository.findOne).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should return Error when the repository cannot find a rental', async () => {
      // GIVEN
      repository.findOne.mockRejectedValue(new Error());

      // THEN
     await expect(useCase.findOne(startDate, endDate)).rejects.toThrow(Error);
    });

    it('should throw "End date must be after start date" when end date is before start date', async () => {
      // GIVEN
      const invalidStart = '2026-05-10';
      const invalidEnd = '2026-05-01';

      // WHEN & THEN
      await expect(useCase.findOne(invalidStart, invalidEnd))
        .rejects.toThrow('End date must be after start date');
      
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('should throw an error when start and end dates are identical', async () => {
      // GIVEN
      const sameDate = '2026-05-01';

      // WHEN & THEN
      await expect(useCase.findOne(sameDate, sameDate))
        .rejects.toThrow('End date must be after start date');
    });
  });
});