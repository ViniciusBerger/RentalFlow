import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/persistence/rental-schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Switch to individual properties since your debug log shows they are loading
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: false,
  },
});