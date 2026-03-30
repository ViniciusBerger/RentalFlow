import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './web/global-exception.filter';
import { setupSwagger } from './web/swagger-provider';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })

  app.useGlobalPipes(validationPipe)
  app.useGlobalFilters(new GlobalExceptionFilter());
  setupSwagger(app);


  app.enableCors({
  // Use the exact URL of your React app (no trailing slash)
  origin: process.env.FRONTEND_URL, 
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Accept, Authorization',
});
  app.use(cookieParser())
  
  const port = Number(process.env.PORT) || 3000;
  console.log('RAILWAY PORT =', process.env.PORT);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
