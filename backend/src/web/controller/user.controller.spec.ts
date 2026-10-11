import { NotFoundException } from '@nestjs/common';
import { UserController } from './user.controller';
import type { FindUserUseCase } from '../../core/domain/user/useCases';

describe('UserController authorization regression', () => {
  const findUser = jest.fn();
  const controller = new UserController({ findUser } as unknown as FindUserUseCase);
  beforeEach(() => jest.clearAllMocks());

  it('retrieves only the server-verified session UID', async () => {
    findUser.mockResolvedValue({ firstName: 'Ana' });
    await expect(controller.getUser({ user: { uid: 'account-a' } })).resolves.toEqual({ firstName: 'Ana' });
    expect(findUser).toHaveBeenCalledWith('account-a');
  });

  it('returns not found if the authenticated account has no profile', async () => {
    findUser.mockResolvedValue(null);
    await expect(controller.getUser({ user: { uid: 'account-a' } })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not expose account enumeration or arbitrary account deletion actions', () => {
    expect((controller as any).getUsers).toBeUndefined();
    expect((controller as any).DeleteUser).toBeUndefined();
  });
});
