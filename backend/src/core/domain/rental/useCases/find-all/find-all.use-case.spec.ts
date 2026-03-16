import { FindAllRentalsUseCase } from './find-all.use-case';
import { Rental } from '../../entity/rental';
import { IRentalRepository } from '../../../../app/ports/IRentalRepository';

describe('FindAllRentalsUseCase', () => {
  let useCase: FindAllRentalsUseCase;
  let repository: jest.Mocked<IRentalRepository>;

  beforeEach(() => {
    // Create a manual mock object
    repository = {
      findAll: jest.fn(),
      // Add other methods as needed to satisfy the interface
    } as any;

    // 2. Inject the mock directly into the constructor
    useCase = new FindAllRentalsUseCase(repository);
  });

  describe('findAll', () => {
    it('should return an array of rentals from the repository', async () => {
      // GIVEN
      const mockRentals: Rental[] = [
        Rental.create({clientFirstName:'John', clientLastName:'Doe', startDate:'2026-01-01', endDate:'2026-01-05', revenue:500, fee:100, profit: 300, guests: 10, isActive: true }),
      ];
      repository.findAll.mockResolvedValue(mockRentals);

      // WHEN
      const result = await useCase.findAll();

      // THEN
      expect(result).toEqual(mockRentals);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array if no rentals exist', async () => {
      // GIVEN
      repository.findAll.mockResolvedValue([]);

      // WHEN
      const result = await useCase.findAll();

      // THEN
      expect(result).toEqual([]);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });
});