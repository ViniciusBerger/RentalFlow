import { User } from './user';
import { UserRole } from './IUserParams';

describe('User domain mapping', () => {
  it('preserves the Firebase UID needed to identify the account', () => {
    const user = User.create({
      firebaseUid: 'firebase-123', email: 'test@example.com',
      firstName: 'Test', lastName: 'User', role: UserRole.HOST,
    });
    expect(user.firebaseUid).toBe('firebase-123');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe(UserRole.HOST);
  });

  it('serializes timestamps from PostgreSQL as ISO dates', () => {
    const user = User.create({ firebaseUid: 'u', firstName: 'A', lastName: 'B',
      email: 'a@example.com', role: UserRole.HOST, createdAt: new Date('2026-01-02T03:04:05Z') });
    expect(user.createdAt).toBe('2026-01-02T03:04:05.000Z');
  });
});
