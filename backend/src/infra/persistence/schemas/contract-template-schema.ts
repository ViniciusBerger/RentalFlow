import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { UserSchema } from './user-schema';

export const ContractTemplateSchema = pgTable('contract_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull()
    .references(() => UserSchema.firebaseUid, { onDelete: 'restrict' }),
  name: varchar('name', { length: 120 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  ownerIndex: index('contract_templates_owner_idx').on(t.userId),
  defaultIndex: uniqueIndex('contract_templates_one_default_owner').on(t.userId).where(sql`${t.isDefault} = true`),
  idOwnerUnique: unique('contract_templates_id_owner_unique').on(t.id, t.userId),
}));
