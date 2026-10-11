import { NotFoundException } from '@nestjs/common';
import { RentalController } from './rental.controller';
import { BalanceController } from './balance.controller';
import { UserController } from './user.controller';

describe('HTTP controller delegation: identity, data, and errors', () => {
  const request = { user: { uid: 'host-1', email: 'host@example.test', isRegistered: true } };
  const rentals = {
    createRental: jest.fn(), deleteRental: jest.fn(), findOne: jest.fn(),
    updateRental: jest.fn(), findAll: jest.fn(), find: jest.fn(), cancelRental: jest.fn(),
  };
  const rental = new RentalController(
    { createRental: rentals.createRental } as any,
    { deleteRental: rentals.deleteRental } as any,
    { findOne: rentals.findOne } as any,
    { updateRental: rentals.updateRental } as any,
    { findAll: rentals.findAll } as any,
    { find: rentals.find } as any,
    { cancelRental: rentals.cancelRental } as any,
  );
  const balances = { getYearlyBalance: jest.fn(), getMonthlyBalance: jest.fn() };
  const balance = new BalanceController(balances as any);
  const users = { findUsers: jest.fn(), deleteUser: jest.fn(), findUser: jest.fn() };
  const user = new UserController({ findUsers: users.findUsers } as any, { deleteUser: users.deleteUser } as any, { findUser: users.findUser } as any);
  beforeEach(() => jest.clearAllMocks());

  it('forwards a rental lookup with the requested dates', async () => {
    const item = { id: 'r-1' }; rentals.findOne.mockResolvedValue(item);
    await expect(rental.getRental(request, { startDate: '2026-11-01', endDate: '2026-11-03' } as any)).resolves.toBe(item);
    expect(rentals.findOne).toHaveBeenCalledWith('host-1','2026-11-01', '2026-11-03');
  });
  it('scopes the list query to the authenticated host', async () => {
    rentals.findAll.mockResolvedValue([{ id: 'r-1' }]);
    expect(await rental.getRentals(request)).toEqual([{ id: 'r-1' }]);
    expect(rentals.findAll).toHaveBeenCalledWith('host-1');
  });
  it('loads only upcoming rentals', async () => {
    rentals.find.mockResolvedValue([]);
    await expect(rental.getNextRentals({user:{uid:'user-1'}})).resolves.toEqual([]);
    expect(rentals.find).toHaveBeenCalledTimes(1);
    expect(rentals.find).toHaveBeenCalledWith('user-1');
  });
  it('creates bookings under the signed-in host instead of a client-provided userId', async () => {
    const input = { userId: 'host-2', clientFirstName: 'A', clientLastName: 'B', startDate: '2026-11-01', endDate: '2026-11-02', guests: 2, revenue: 100, fee: 15 };
    rentals.createRental.mockResolvedValue({ id: 'r-1' });
    await rental.createRental(request as any, input as any);
    expect(rentals.createRental).toHaveBeenCalledWith('host-1', 'A', 'B', '2026-11-01', '2026-11-02', 2, 100, 15);
  });
  it('delegates updates and propagates failures', async () => {
    rentals.updateRental.mockResolvedValue(true);
    expect(await rental.updateRental(request, { id: 'r-1', toBeUpdated: { guests: 3 } } as any)).toBe(true);
    expect(rentals.updateRental).toHaveBeenCalledWith('host-1','r-1', { guests: 3 });
    rentals.updateRental.mockRejectedValue(new Error('storage offline'));
    await expect(rental.updateRental(request, { id: 'r-1', toBeUpdated: {} } as any)).rejects.toThrow('storage offline');
  });
  it('delegates cancel and delete without confusing them', async () => {
    rentals.cancelRental.mockResolvedValue(true); rentals.deleteRental.mockResolvedValue(true);
    await expect(rental.cancelRental(request,'r-1')).resolves.toBe(true);
    await expect(rental.deleteRental(request,'r-2')).resolves.toBe(true);
    expect(rentals.cancelRental).toHaveBeenCalledWith('host-1','r-1');
    expect(rentals.deleteRental).toHaveBeenCalledWith('host-1','r-2');
  });
  it('keeps monthly and yearly financial totals scoped to the host', async () => {
    balances.getMonthlyBalance.mockResolvedValue([{ label: '2026-11', totalRevenue: 300 }]);
    balances.getYearlyBalance.mockResolvedValue([{ label: '2026', totalRevenue: 1000 }]);
    expect(await balance.getMonthlyRevenue(request)).toHaveLength(1);
    expect(await balance.getYearlyRevenue(request)).toHaveLength(1);
    expect(balances.getMonthlyBalance).toHaveBeenCalledWith('host-1');
    expect(balances.getYearlyBalance).toHaveBeenCalledWith('host-1');
  });
  it('looks up the current host and refuses to return a nonexistent account', async () => {
    users.findUser.mockResolvedValueOnce({ firebaseUid: 'host-1' }).mockResolvedValueOnce(null);
    await expect(user.getUser(request)).resolves.toEqual({ firebaseUid: 'host-1' });
    expect(users.findUser).toHaveBeenCalledWith('host-1');
    await expect(user.getUser(request)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('returns the user list and runs deletion', async () => {
    users.findUsers.mockResolvedValue([{ firebaseUid: 'host-1' }]);
    expect(await user.getUsers()).toHaveLength(1);
    users.deleteUser.mockResolvedValue(true);
    await expect(user.DeleteUser('host-1')).resolves.toBe(true);
    users.deleteUser.mockResolvedValue(false);
    await expect(user.DeleteUser('missing')).resolves.toBe(false);
    expect(users.deleteUser).toHaveBeenCalledWith('host-1');
  });
});
