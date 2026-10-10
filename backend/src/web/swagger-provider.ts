import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Encapsulates Swagger configuration to keep main.ts clean.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('My Rentals API')
    .setDescription('Management system for rentals and revenue reporting')
    .setVersion('1.0')
    .addTag('MyRentalsAPI', 'Rental operations and financial reports')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // This serves the documentation at http://localhost:PORT/api
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // useful for auth
    },
  });
}