import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { OnboardingGuard } from './onboarding.guard';

describe('OnboardingGuard', () => {
  const guard = new OnboardingGuard();
  const ctx = (user?: unknown) => ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

  it('allows a registered host to reach protected endpoints', () => {
    expect(guard.canActivate(ctx({ uid: 'host-1', isRegistered: true }))).toBe(true);
  });
  it('rejects a missing or unverified session', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException);
    spy.mockRestore();
  });
  it('rejects incomplete onboarding even if the identity is authenticated', () => {
    expect(() => guard.canActivate(ctx({ uid: 'host-1', isRegistered: false }))).toThrow(ForbiddenException);
  });
});
