import { DeleteRentalUseCase } from './delete-rental.use-case';
import { IRentalRepository } from '../../../app/ports/IRentalRepository';

describe('DeleteRentalUseCase (Manual Injection)', () => {
  let useCase: DeleteRentalUseCase;
  let repository: jest.Mocked<IRentalRepository>;

  beforeEach(() => {
    // Create a mock object that matches the IRentalRepository interface
    repository = {
      delete: jest.fn(),
    } as any;

    // 2. Manually instantiate the Use Case. 
    // This is 100% clean and guarantees 'rentalRepository' is defined.
    useCase = new DeleteRentalUseCase(repository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('deleteRental', () => {
    it('should return true when the repository successfully deletes a rental', async () => {
      // GIVEN
      const id = 'valid-uuid';
      repository.delete.mockResolvedValue(true);

      // WHEN
      const result = await useCase.deleteRental(id);

      // THEN
      expect(result).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith(id);
    });

    it('should throw an error when the repository fails to delete (returns false)', async () => {
      // GIVEN
      const id = 'missing-uuid';
      repository.delete.mockResolvedValue(false);

      // WHEN & THEN
      await expect(useCase.deleteRental(id))
        .rejects.toThrow('Could not delete user'); 
      
      expect(repository.delete).toHaveBeenCalledWith(id);
    });
  });
});