import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, integer, jsonb, pgTable, time, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { PropertySchema } from './property-schema';

// All settings begin NULL for existing properties. Do not silently introduce
// legal or occupancy rules for already-booked properties during migration.
export const PropertyContractSettingsSchema = pgTable('property_contract_settings', {
  propertyId: uuid('property_id').primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  includedOccupancy: integer('included_occupancy'),
  maximumOccupancy: integer('maximum_occupancy'),
  extraGuestRateCents: integer('extra_guest_rate_cents'),
  checkInTime: time('check_in_time'),
  checkOutTime: time('check_out_time'),
  providesLinen: boolean('provides_linen'),
  hasPool: boolean('has_pool'),
  houseRules: jsonb('house_rules').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  capacityCheck: check('property_contract_settings_capacity_check', sql`(${t.includedOccupancy} IS NULL AND ${t.maximumOccupancy} IS NULL AND ${t.extraGuestRateCents} IS NULL) OR (${t.includedOccupancy} > 0 AND ${t.maximumOccupancy} >= ${t.includedOccupancy} AND ${t.extraGuestRateCents} >= 0)`),
  rulesCheck: check('property_contract_settings_house_rules_array', sql`jsonb_typeof(${t.houseRules}) = 'array'`),
  ownerFk: foreignKey({ columns: [t.propertyId, t.userId],
    foreignColumns: [PropertySchema.id, PropertySchema.userId],
    name: 'property_contract_settings_owner_fk' }).onDelete('restrict'),
}));
