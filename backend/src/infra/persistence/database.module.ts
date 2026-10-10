import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas/rental-schema';

export const DRIZZLE = 'DRIZZLE_CONNECTION';

@Global()
@Module({
  imports: [ConfigModule], // Make sure ConfigModule is available here
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService], // Inject ConfigService
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL must be configured');
        }

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