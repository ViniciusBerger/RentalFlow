import { jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { UserSchema } from './user-schema';
import { encryptedBytes } from './encrypted-column';

export const ContractSettingsSchema = pgTable('contract_settings', {
  userId: varchar('user_id', { length: 128 }).primaryKey()
    .references(() => UserSchema.firebaseUid, { onDelete: 'restrict' }),
  // No plaintext identification, bank details or residential addresses.
  profileCiphertext: encryptedBytes('profile_ciphertext'),
  profileNonce: encryptedBytes('profile_nonce'),
  profileAuthTag: encryptedBytes('profile_auth_tag'),
  profileKeyVersion: varchar('profile_key_version', { length: 32 }),
  policyConfig: jsonb('policy_config').$type<Record<string, unknown>>().notNull().default({}),
  paymentDefaults: jsonb('payment_defaults').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
