import { boolean, index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { UserSchema } from './user-schema';

export const PropertySchema = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => UserSchema.firebaseUid, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  address: varchar('address', { length: 300 }),
  color: varchar('color', { length: 7 }).notNull().default('#0D8A57'),
  icon: varchar('icon', { length: 30 }).notNull().default('building'),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
  ownerIndex: index('properties_owner_idx').on(table.userId),
  ownerIdUnique: unique('properties_id_owner_unique').on(table.id, table.userId),
}));
export type PropertyRow = typeof PropertySchema.$inferSelect;
