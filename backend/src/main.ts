import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './web/global-exception.filter';
import { setupSwagger } from './web/swagger-provider';
import cookieParser from 'cookie-parser';
import { csrfOriginProtection } from './infra/middleware/csrf-origin-protection';
import { requireSessionCsrf } from './infra/middleware/csrf-session';
import { securityRateLimit } from './infra/middleware/security-rate-limit';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  })

  app.useGlobalPipes(validationPipe)
  app.useGlobalFilters(new GlobalExceptionFilter());
  if (process.env.NODE_ENV !== 'production') setupSwagger(app);


  const allowedOrigins = [
  'https://rentalflow.club',
  'https://www.rentalflow.club',
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']),
].filter((origin): origin is string => Boolean(origin));

  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.use(csrfOriginProtection(allowedOrigins));
  app.use(securityRateLimit());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-CSRF-Token',
  });
  
  app.use(cookieParser());
  app.use(requireSessionCsrf);
  
  const port = Number(process.env.PORT) || 3000;
  console.log('RAILWAY PORT =', process.env.PORT);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
