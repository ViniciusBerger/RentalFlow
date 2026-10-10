import { createHmac } from 'node:crypto';
import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import type { AuthenticateUseCase } from '../../core/domain/auth/useCase/authenticate/authenticate.use-case';
import type { CompleteProfileUseCase } from '../../core/domain/user/useCases/complete-profile/complete-profile.use-case';

describe('AuthController development login / production isolation', () => {
  const previousEnvironment = { ...process.env };
  const secret = 'another-secret-which-is-longer-than-32-characters';
  const authenticate = jest.fn();
  const completeProfile = jest.fn();
  const res: any = { cookie: jest.fn(), clearCookie: jest.fn() };
  const controller = new AuthController(
    { authenticate } as unknown as AuthenticateUseCase,
    { execute: completeProfile } as unknown as CompleteProfileUseCase,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.DEV_LOGIN_EMAIL = 'test@test.com';
    process.env.DEV_LOGIN_PASSWORD = 'test123';
    process.env.DEV_AUTH_SECRET = secret;
    completeProfile.mockResolvedValue(true);
  });
  afterAll(() => { process.env = previousEnvironment; });

  it('issues a signed HttpOnly cookie for valid credentials and creates a local profile', async () => {
    await expect(controller.authenticate({ email: 'test@test.com', password: 'test123' }, res)).resolves.toEqual({ message: 'Development login successful' });
    expect(completeProfile).toHaveBeenCalledWith('rentalflow-local-dev', 'test@test.com', 'Test', 'Developer');
    expect(authenticate).not.toHaveBeenCalled();
    const [name, cookie, options] = res.cookie.mock.calls[0];
    expect(name).toBe('rf_dev_session');
    expect(options).toEqual(expect.objectContaining({ httpOnly: true, secure: false, sameSite: 'lax' }));
    const [uid, expiry, signature] = cookie.split('.');
    expect(uid).toBe('rentalflow-local-dev');
    expect(Number(expiry)).toBeGreaterThan(Date.now());
    expect(signature).toBe(createHmac('sha256', secret).update(`${uid}.${expiry}`).digest('hex'));
    expect(cookie).not.toContain('test123');
  });

  it('rejects invalid dev credentials without creating a cookie or user', async () => {
    await expect(controller.authenticate({ email: 'test@test.com', password: 'wrong' }, res)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(completeProfile).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('rejects dev login when the signing secret is too short', async () => {
    process.env.DEV_AUTH_SECRET = 'unsafe';
    await expect(controller.authenticate({ email: 'test@test.com', password: 'test123' }, res)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(completeProfile).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('does not issue a session if the development profile cannot be persisted', async () => {
    completeProfile.mockResolvedValue(false);
    await expect(controller.authenticate({ email: 'test@test.com', password: 'test123' }, res)).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('does not expose dev authentication in production', async () => {
    process.env.NODE_ENV = 'production';
    authenticate.mockResolvedValue({ idToken: 'firebase-token', uid: 'firebase', email: 'test@test.com' });
    await controller.authenticate({ email: 'test@test.com', password: 'test123' }, res);
    expect(completeProfile).not.toHaveBeenCalled();
    expect(authenticate).toHaveBeenCalledWith({ email: 'test@test.com', password: 'test123' });
    expect(res.cookie).toHaveBeenCalledWith('__Host-access_token', 'firebase-token', expect.objectContaining({ secure: true, httpOnly: true, sameSite: 'none' }));
  });

  it('clears both session cookies when logging out', async () => {
    await expect(controller.logout(res)).resolves.toEqual({ message: 'Logged out successfully' });
    expect(res.clearCookie).toHaveBeenCalledWith('rf_dev_session', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('__Host-access_token', expect.any(Object));
  });
  it('uses Firebase sign-in when a different email is supplied in development', async () => {
    authenticate.mockResolvedValue({idToken:'id-token',uid:'real',email:'real@example.test'});
    await expect(controller.authenticate({email:'real@example.test',password:'realpw'},res)).resolves.toEqual({message:'login sucessful'});
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(completeProfile).not.toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith('__Host-access_token','id-token',expect.objectContaining({secure:false,sameSite:'lax'}));
  });
  it('uses Firebase when the development login feature flag is off',async()=>{
    process.env.ENABLE_DEV_LOGIN='false';
    authenticate.mockResolvedValue({idToken:'id-token'});
    await controller.authenticate({email:'test@test.com',password:'test123'},res);
    expect(authenticate).toHaveBeenCalled();
    expect(completeProfile).not.toHaveBeenCalled();
  });
  it('rejects a development login if the expected password is unset',async()=>{
    delete process.env.DEV_LOGIN_PASSWORD;
    await expect(controller.authenticate({email:'test@test.com',password:'test123'},res)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(res.cookie).not.toHaveBeenCalled();
  });
  it('propagates profile creation failures without setting a cookie',async()=>{
    completeProfile.mockRejectedValue(new Error('postgres unavailable'));
    await expect(controller.authenticate({email:'test@test.com',password:'test123'},res)).rejects.toThrow('postgres unavailable');
    expect(res.cookie).not.toHaveBeenCalled();
  });
  it('exposes the authenticated identity returned by the guard',()=>{
    expect(controller.getMe({user:{uid:'host-1',email:'host@test.com',isRegistered:true}} as any)).toEqual({uid:'host-1',email:'host@test.com',isRegistered:true});
  });
  it('associates onboarding with server-verified identity, not posted user IDs',async()=>{
    completeProfile.mockResolvedValue(true);
    await controller.completeProfile({user:{uid:'host-1',email:'host@test.com',isRegistered:false}} as any,{firstName:'Ana',lastName:'Silva',uid:'attacker'} as any);
    expect(completeProfile).toHaveBeenCalledWith('host-1','host@test.com','Ana','Silva');
  });
  it('clears production cookies with production security flags',async()=>{
    process.env.NODE_ENV='production';
    await controller.logout(res);
    expect(res.clearCookie).toHaveBeenCalledWith('__Host-access_token', expect.objectContaining({secure:true,sameSite:'none'}));
  });

});
