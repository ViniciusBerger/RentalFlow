import { pgTable, uuid, varchar, doublePrecision, timestamp, date, index, boolean, integer } from "drizzle-orm/pg-core";
import { UserSchema } from "./user-schema";

// Define the table
export const RentalSchema = pgTable("rentals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(()=> UserSchema.id),
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
  userIdIdx: index('user_id_index').on(table.userId)
}));

// Optional: Export types for use in your Adapter
export type RentalRow = typeof RentalSchema.$inferSelect; 
export type NewRentalRow = typeof RentalSchema.$inferInsert;