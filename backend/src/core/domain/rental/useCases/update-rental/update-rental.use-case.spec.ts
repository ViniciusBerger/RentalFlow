import { UpdateRentalUseCase } from './update-rental.use-case';
import { IRentalRepository } from '../../../app/ports/IRentalRepository';

describe('UpdateRentalUseCase (Manual Injection)', () => {
  let useCase: UpdateRentalUseCase;
  let repository: jest.Mocked<IRentalRepository>;

  beforeEach(() => {
    // 1. Manually create the mock object
    repository = {
      update: jest.fn(),
    } as any;

    // 2. Inject the mock directly into the constructor
    // No NestJS dependencies needed here
    useCase = new UpdateRentalUseCase(repository);
  });

  describe('updateRental', () => {
    const rentalId = 'uuid-123';
    const updateData = { revenue: 1200 };

    it('should return true when the repository successfully updates the rental', async () => {
      // GIVEN: Repository returns true (or the updated object)
      repository.update.mockResolvedValue(true as any);

      // WHEN
      const result = await useCase.updateRental(rentalId, updateData);

      // THEN
      expect(result).toBe(true);
      expect(repository.update).toHaveBeenCalledWith(rentalId, updateData);
    });

    it('should throw "Could not update user" when the repository returns false/null', async () => {
      // GIVEN: Repository fails to find or update the record
      repository.update.mockResolvedValue(false as any);

      // WHEN & THEN
      await expect(useCase.updateRental(rentalId, updateData))
        .rejects.toThrow('Could not update user');
      
      expect(repository.update).toHaveBeenCalledTimes(1);
    });
  });
});