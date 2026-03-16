import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './web/global-exception.filter';
import { setupSwagger } from './web/swagger-provider';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new GlobalExceptionFilter());
  
  setupSwagger(app);
  app.enableCors({
  // Use the exact URL of your React app (no trailing slash)
  origin: 'http://localhost:5173', 
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Accept, Authorization',
});
  app.use(cookieParser())
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
