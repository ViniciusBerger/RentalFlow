import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Add this
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './rental-schema';

export const DRIZZLE = 'DRIZZLE_CONNECTION';

@Global()
@Module({
  imports: [ConfigModule], // Make sure ConfigModule is available here
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService], // Inject ConfigService
      useFactory: (configService: ConfigService) => {
        // Build the URL inside the factory
        const user = configService.get('DB_USER');
        const pass = configService.get('DB_PASSWORD');
        const host = configService.get('DB_HOST');
        const port = configService.get('DB_PORT');
        const name = configService.get('DB_NAME');

        const connectionString = `postgresql://${user}:${pass}@${host}:${port}/${name}`;

        const pool = new Pool({
          connectionString,
        });

        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}