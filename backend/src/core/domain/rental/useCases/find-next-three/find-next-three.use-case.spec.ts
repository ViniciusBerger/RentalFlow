import { FindNextThreeUseCase } from './find-next-three.use-case';
import { IRentalRepository } from 'src/core/app/ports/IRentalRepository';
import { Rental } from '../../entity/rental';

describe('FindNextThreeUseCase', () => {
  let useCase: FindNextThreeUseCase;
  let repositoryMock: jest.Mocked<IRentalRepository>;

  beforeEach(() => {
    // 1. Create a mock of the Repository Port
    repositoryMock = {
      findNextThree: jest.fn(),
    } as any;

    useCase = new FindNextThreeUseCase(repositoryMock);
  });

  it('should return the upcoming rentals supplied by the repository', async () => {
    // Arrange: Define what the mock should return
    const mockRentals = [
      new Rental({ userId: 'testid123', clientFirstName: 'Alice', clientLastName: 'Z', startDate: '2026-04-01', endDate: '2026-04-05', guests: 2, revenue: 500, profit: 400, fee: 100, isActive: true }),
      new Rental({ userId: 'testid123', clientFirstName: 'Bob', clientLastName: 'Y', startDate: '2026-05-01', endDate: '2026-05-05', guests: 3, revenue: 600, profit: 500, fee: 100, isActive: true }),
    ];
    repositoryMock.findNextThree.mockResolvedValue(mockRentals);

    // Act: Call the use case
    const result = await useCase.find('user-1');

    // Assert: Check results and repository interaction
    expect(result).toHaveLength(2);
    expect(result).toEqual(mockRentals);
    expect(repositoryMock.findNextThree).toHaveBeenCalledTimes(1);
    expect(repositoryMock.findNextThree).toHaveBeenCalledWith('user-1');
  });

  it('should propagate errors from the repository', async () => {
    // Arrange: Mock a repository failure (e.g., PersistenceError)
    repositoryMock.findNextThree.mockRejectedValue(new Error('Database failure'));

    // Act & Assert: Ensure the Use Case doesn't swallow the error
    await expect(useCase.find('user-1')).rejects.toThrow('Database failure');
  });

  it('should return an empty array if the repository has no upcoming rentals', async () => {
    // Arrange
    repositoryMock.findNextThree.mockResolvedValue([]);

    // Act
    const result = await useCase.find('user-1');

    // Assert
    expect(result).toEqual([]);
  });
});