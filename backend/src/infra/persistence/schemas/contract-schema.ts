import { foreignKey, index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { RentalSchema } from './rental-schema';

export const ContractSchema = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  rentalId: uuid('rental_id').notNull().unique(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  rentalOwnerFk: foreignKey({ columns: [t.rentalId, t.userId],
    foreignColumns: [RentalSchema.id, RentalSchema.userId],
    name: 'contracts_rental_owner_fk' }).onDelete('restrict'),
  idOwnerUnique: unique('contracts_id_owner_unique').on(t.id, t.userId),
  ownerIdx: index('contracts_owner_idx').on(t.userId),
}));
