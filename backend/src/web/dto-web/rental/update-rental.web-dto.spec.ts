import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRentalWebDto } from './update-rental.web-dto';

describe('UpdateRentalWebDto field-level validation', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const validateRequest = (changes: unknown) => validate(plainToInstance(UpdateRentalWebDto, { id, toBeUpdated: changes }), {
    whitelist: true, forbidNonWhitelisted: true,
  });

  it('accepts valid proposed changes', async () => {
    expect(await validateRequest({ guests: 3, fee: 25, revenue: 399.99 })).toHaveLength(0);
  });

  it('rejects unapproved status and tenant-ownership fields', async () => {
    expect(await validateRequest({ userId: 'victim' })).not.toHaveLength(0);
    expect(await validateRequest({ isActive: false })).not.toHaveLength(0);
  });

  it('rejects negative amounts, bad dates, and non-integer guest counts', async () => {
    expect(await validateRequest({ revenue: -1 })).not.toHaveLength(0);
    expect(await validateRequest({ startDate: 'not-a-date' })).not.toHaveLength(0);
    expect(await validateRequest({ guests: 2.5 })).not.toHaveLength(0);
  });

  it('rejects arrays where an update object is expected', async () => {
    expect(await validateRequest([{ fee: 1 }])).not.toHaveLength(0);
  });
});
