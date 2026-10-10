import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import type { IAuthPort } from '../../../core/app/ports/IAuthPort';

describe('AuthGuard session verification', () => {
  const oldEnv = { ...process.env };
  const secret = 'a-test-secret-which-is-longer-than-32-characters';
  const mockAuthPort = { validateJWT: jest.fn() };
  const guard = new AuthGuard(mockAuthPort as unknown as IAuthPort);
  const validSession = (expires: number, uid = 'rentalflow-local-dev') => {
    const payload = `${uid}.${expires}`;
    return `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`;
  };
  const request = (cookies: Record<string, string>) => {
    const req: any = { cookies };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };
    return { req, ctx };
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.DEV_AUTH_SECRET = secret;
    process.env.DEV_LOGIN_EMAIL = 'test@test.com';
    jest.clearAllMocks();
  });
  afterAll(() => { process.env = oldEnv; });

  it('accepts an authentic, nonexpired development session and attaches a user', async () => {
    const { req, ctx } = request({ rf_dev_session: validSession(Date.now() + 60_000) });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ uid: 'rentalflow-local-dev', email: 'test@test.com', role: 'host', isRegistered: true });
    expect(mockAuthPort.validateJWT).not.toHaveBeenCalled();
  });

  it('rejects forged signatures', async () => {
    const session = validSession(Date.now() + 60_000);
    const { ctx } = request({ rf_dev_session: session.slice(0, -64) + '0'.repeat(64) });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired development sessions', async () => {
    const { ctx } = request({ rf_dev_session: validSession(Date.now() - 60_000) });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a signed session with an unexpected UID', async () => {
    const { ctx } = request({ rf_dev_session: validSession(Date.now() + 60_000, 'another-user') });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('never accepts development sessions in production', async () => {
    process.env.NODE_ENV = 'production';
    const { ctx } = request({ rf_dev_session: validSession(Date.now() + 60_000) });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockAuthPort.validateJWT).not.toHaveBeenCalled();
  });

  it('uses Firebase to verify production tokens and preserves verified identity', async () => {
    process.env.NODE_ENV = 'production';
    const verified = { uid: 'firebase-user', email: 'real@example.com', role: 'host', isRegistered: true };
    mockAuthPort.validateJWT.mockResolvedValue(verified);
    const { req, ctx } = request({ '__Host-access_token': 'firebase-token' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockAuthPort.validateJWT).toHaveBeenCalledWith('firebase-token');
    expect(req.user).toEqual(verified);
  });

  it('rejects requests without any session or token', async () => {
    const { ctx } = request({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts the legacy cookie name only after Firebase validation', async () => {
    process.env.NODE_ENV = 'production';
    mockAuthPort.validateJWT.mockResolvedValue({ uid: 'host-1', isRegistered: true });
    const { req, ctx } = request({ access_token: 'legacy-token' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mockAuthPort.validateJWT).toHaveBeenCalledWith('legacy-token');
    expect(req.user.uid).toBe('host-1');
  });
  it('does not trust a dev cookie when the development secret is unavailable', async () => {
    process.env.DEV_AUTH_SECRET = '';
    const { ctx } = request({ rf_dev_session: validSession(Date.now() + 10000) });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects malformed development cookies with too many components', async () => {
    const { ctx } = request({ rf_dev_session: 'wrong.format.cookie.more' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects invalid hexadecimal signatures without throwing a low-level crypto exception', async () => {
    const cookie = validSession(Date.now() + 10000).slice(0, -64) + 'z'.repeat(64);
    const { ctx } = request({ rf_dev_session: cookie });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('does not bypass Firebase when feature flag is disabled in development', async () => {
    process.env.ENABLE_DEV_LOGIN = 'false';
    const { ctx } = request({ rf_dev_session: validSession(Date.now() + 10000) });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

});
