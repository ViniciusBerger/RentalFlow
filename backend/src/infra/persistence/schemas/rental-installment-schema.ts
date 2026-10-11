import { sql } from 'drizzle-orm';
import { boolean, date, check, foreignKey, index, integer, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { RentalSchema } from './rental-schema';

export const RentalInstallmentSchema = pgTable('rental_installments', {
  id: uuid('id').primaryKey().defaultRandom(),
  rentalId: uuid('rental_id').notNull(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  sequence: integer('sequence').notNull(),
  agreedCents: integer('agreed_cents').notNull(),
  dueDate: date('due_date'),
  dueEvent: varchar('due_event', { length: 32 }),
  paymentMethod: varchar('payment_method', { length: 40 }),
  isDeposit: boolean('is_deposit').notNull().default(false),
  receivedCents: integer('received_cents').notNull().default(0),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  rentalOwnerFk: foreignKey({ columns: [t.rentalId, t.userId],
    foreignColumns: [RentalSchema.id, RentalSchema.userId],
    name: 'rental_installments_owner_fk' }).onDelete('restrict'),
  orderUnique: unique('rental_installments_sequence_unique').on(t.rentalId, t.sequence),
  amountCheck: check('rental_installments_amount_check',sql`${t.agreedCents} >= 0 AND ${t.receivedCents} >= 0 AND ${t.receivedCents} <= ${t.agreedCents}`),
  seqCheck: check('rental_installments_sequence_check',sql`${t.sequence} BETWEEN 1 AND 12`),
  dueCheck: check('rental_installments_due_check',sql`${t.dueDate} IS NULL OR ${t.dueEvent} IS NULL`),
  eventCheck: check('rental_installments_event_check',sql`${t.dueEvent} IS NULL OR ${t.dueEvent} IN ('CHECKIN','KEY_HANDOVER','AGREED_EVENT')`),
  ownerIdx: index('rental_installments_owner_idx').on(t.userId, t.rentalId),
}));
