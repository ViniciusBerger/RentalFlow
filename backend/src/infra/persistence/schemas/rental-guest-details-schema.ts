import { foreignKey, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { RentalSchema } from './rental-schema';
import { encryptedBytes } from './encrypted-column';

// One Brazilian contracting guest per rental. No raw CPF/RG/contact fields.
// Missing identity is allowed in drafts; the service verifies completeness.
export const RentalGuestDetailsSchema = pgTable('rental_guest_details', {
  rentalId: uuid('rental_id').primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  identityCiphertext: encryptedBytes('identity_ciphertext'),
  identityNonce: encryptedBytes('identity_nonce'),
  identityAuthTag: encryptedBytes('identity_auth_tag'),
  identityKeyVersion: varchar('identity_key_version', { length: 32 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  rentalOwnerFk: foreignKey({ columns: [t.rentalId, t.userId],
    foreignColumns: [RentalSchema.id, RentalSchema.userId],
    name: 'rental_guest_details_owner_fk' }).onDelete('restrict'),
  rentalOwnerUnique: unique('rental_guest_details_rental_owner_unique').on(t.rentalId, t.userId),
}));
