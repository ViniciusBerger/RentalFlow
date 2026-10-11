import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, doublePrecision, timestamp, date, index, boolean, integer, foreignKey, unique, check } from "drizzle-orm/pg-core";
import { PropertySchema } from "./property-schema";
import { UserSchema } from "./user-schema";

// Define the table
export const RentalSchema = pgTable("rentals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(()=> UserSchema.firebaseUid, { onDelete: "cascade" }),
  propertyId: uuid("property_id").notNull(),
  clientFirstName: varchar('first_name', {length:255}).notNull(),
  clientLastName: varchar('last_name', {length:255}).notNull(), 
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  guests: integer("number_of_guests").notNull(),
  revenue: doublePrecision("total_revenue").notNull(),
  profit: doublePrecision('profit').notNull(),
  fee: doublePrecision("fee").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
},

// index
(table)=> ({
  startDateIdx: index("start_date_idx").on(table.startDate),
  userIdIdx: index('user_id_index').on(table.userId),
  propertyOwnerFk: foreignKey({columns:[table.propertyId,table.userId], foreignColumns:[PropertySchema.id,PropertySchema.userId], name:"rentals_property_owner_fk"}),
  propertyIdx: index("rentals_property_idx").on(table.propertyId),
  rentalOwnerUnique: unique("rentals_id_owner_unique").on(table.id,table.userId),
  dateCheck: check("rental_valid_dates",sql.raw('"end_date" > "start_date"'))
}));

// Optional: Export types for use in your Adapter
export type RentalRow = typeof RentalSchema.$inferSelect; 
export type NewRentalRow = typeof RentalSchema.$inferInsert;