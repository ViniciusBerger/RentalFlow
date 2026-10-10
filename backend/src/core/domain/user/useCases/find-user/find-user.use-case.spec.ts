import { FindUserUseCase } from './find-user.use-case';
import { IUserRepository } from '../../../../app/ports/IUserRepository';

describe('FindUserUseCase', () => {
  const select = jest.fn();
  const useCase = new FindUserUseCase({ select } as unknown as IUserRepository);
  beforeEach(() => select.mockReset());
  it('loads the requested host without substituting another identity', async () => {
    const user = { firebaseUid: 'host-1', email: 'one@example.test' };
    select.mockResolvedValue(user);
    await expect(useCase.findUser('host-1')).resolves.toBe(user);
    expect(select).toHaveBeenCalledWith('host-1');
  });
  it('returns null when a host does not exist', async () => {
    select.mockResolvedValue(null);
    await expect(useCase.findUser('missing')).resolves.toBeNull();
  });
  it('propagates persistence outages rather than pretending the host is missing', async () => {
    select.mockRejectedValue(new Error('database unavailable'));
    await expect(useCase.findUser('host-1')).rejects.toThrow('database unavailable');
  });
});
