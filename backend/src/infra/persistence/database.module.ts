import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as rental from './schemas/rental-schema';
import * as property from './schemas/property-schema';
import * as user from './schemas/user-schema';
import * as contractSettings from './schemas/contract-settings-schema';
import * as propertyContractSettings from './schemas/property-contract-settings-schema';
import * as contractTemplate from './schemas/contract-template-schema';
import * as contractTemplateVersion from './schemas/contract-template-version-schema';
import * as rentalGuest from './schemas/rental-guest-details-schema';
import * as rentalInstallments from './schemas/rental-installment-schema';
import * as contracts from './schemas/contract-schema';
import * as revisions from './schemas/contract-revision-schema';
import * as security from './schemas/contract-security-schema';
const schema = {...rental,...property,...user,...contractSettings,...propertyContractSettings,
  ...contractTemplate,...contractTemplateVersion,...rentalGuest,...rentalInstallments,
  ...contracts,...revisions,...security};

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