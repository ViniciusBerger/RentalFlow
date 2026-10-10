import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('GET / health check (HTTP e2e)', () => {
  let app: INestApplication;
  const previousEnv = { ...process.env };

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'true';
    process.env.DEV_AUTH_SECRET = 'development-test-secret-longer-than-thirty-two';
    process.env.DATABASE_URL = 'postgresql://postgres:test@localhost:5432/rentalflow_test';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); process.env = previousEnv; });

  it('responds 200 with the current health response', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ status: 200, message: 'success' });
  });
});
