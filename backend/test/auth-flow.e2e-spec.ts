import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthController } from '../src/web/controller/auth.controller';
import { AuthGuard } from '../src/infra/adapters/guards/auth.guard';
import { AuthenticateUseCase } from '../src/core/domain/auth/useCase/authenticate/authenticate.use-case';
import { CompleteProfileUseCase } from '../src/core/domain/user/useCases/complete-profile/complete-profile.use-case';

describe('Development authentication (HTTP integration, mocked persistence)', () => {
  let app: INestApplication;
  const savedEnv = { ...process.env };
  const completeProfile = jest.fn().mockResolvedValue(true);
  const firebaseAuth = jest.fn();

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.DEV_LOGIN_EMAIL = 'test@test.com';
    process.env.DEV_LOGIN_PASSWORD = 'test123';
    process.env.DEV_AUTH_SECRET = 'development-test-secret-for-this-integration-suite';

    const mod = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthGuard,
        { provide: 'IAuthPort', useValue: { validateJWT: firebaseAuth } },
        { provide: AuthenticateUseCase, useValue: { authenticate: firebaseAuth } },
        { provide: CompleteProfileUseCase, useValue: { execute: completeProfile } },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env = savedEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    completeProfile.mockResolvedValue(true);
  });

  it('logs in with development credentials and authenticates the session at /auth/me', async () => {
    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'test123' })
      .expect(201);
    const cookie = loggedIn.headers['set-cookie'];
    expect(cookie).toBeDefined();
    const sessionCookie = Array.isArray(cookie) ? cookie.find((s: string) => s.startsWith('rf_dev_session=')) : cookie;
    expect(sessionCookie).toMatch(/HttpOnly/);
    const session = String(sessionCookie).split(';')[0];
    const response = await request(app.getHttpServer()).get('/auth/me').set('Cookie', session).expect(200);
    expect(response.body).toMatchObject({ uid: 'rentalflow-local-dev', email: 'test@test.com', role: 'host' });
    expect(firebaseAuth).not.toHaveBeenCalled();
    expect(completeProfile).toHaveBeenCalledTimes(1);
  });

  it('rejects an incorrect password and does not create a session', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'not-test123' })
      .expect(401);
    expect(completeProfile).not.toHaveBeenCalled();
  });

  it('rejects un-authenticated requests to /auth/me', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
