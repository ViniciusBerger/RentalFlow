import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/infra/persistence/schemas/rental-schema.ts', './src/infra/persistence/schemas/user-schema.ts', './src/infra/persistence/schemas/property-schema.ts', './src/infra/persistence/schemas/contract-*-schema.ts', './src/infra/persistence/schemas/rental-guest-details-schema.ts', './src/infra/persistence/schemas/rental-installment-schema.ts', './src/infra/persistence/schemas/property-contract-settings-schema.ts'],
  out: './drizzle',
  dbCredentials: {
     url: process.env.DATABASE_URL!,
  },
});