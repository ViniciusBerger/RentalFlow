import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/infra/persistence/schemas/rental-schema.ts', './src/infra/persistence/schemas/user-schema.ts', './src/infra/persistence/schemas/property-schema.ts'],
  out: './drizzle',
  dbCredentials: {
     url: process.env.DATABASE_URL!,
  },
});