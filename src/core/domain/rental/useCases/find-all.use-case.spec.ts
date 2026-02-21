import { FindAllRentalsUseCase } from './find-all.use-case';
import { Rental } from '../entitiy/rental';
import { IRentalRepository } from '../../../app/ports/IRentalRepository';

describe('FindAllRentalsUseCase', () => {
  let useCase: FindAllRentalsUseCase;
  let repository: jest.Mocked<IRentalRepository>;

  beforeEach(() => {
    // Create a manual mock object
    repository = {
      getAll: jest.fn(),
      // Add other methods as needed to satisfy the interface
    } as any;

    // 2. Inject the mock directly into the constructor
    useCase = new FindAllRentalsUseCase(repository);
  });

  describe('findAll', () => {
    it('should return an array of rentals from the repository', async () => {
      // GIVEN
      const mockRentals: Rental[] = [
        new Rental('John', 'Doe', '2026-01-01', '2026-01-05', 500),
      ];
      repository.getAll.mockResolvedValue(mockRentals);

      // WHEN
      const result = await useCase.findAll();

      // THEN
      expect(result).toEqual(mockRentals);
      expect(repository.getAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array if no rentals exist', async () => {
      // GIVEN
      repository.getAll.mockResolvedValue([]);

      // WHEN
      const result = await useCase.findAll();

      // THEN
      expect(result).toEqual([]);
      expect(repository.getAll).toHaveBeenCalled();
    });
  });
});