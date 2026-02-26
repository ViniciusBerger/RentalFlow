import { pgTable, uuid, varchar, doublePrecision, timestamp, date, index, boolean, integer } from "drizzle-orm/pg-core";

// Define the table
export const RentalSchema = pgTable("rentals", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientFirstName: varchar("customer_first_name", { length: 255 }).notNull(),
  clientLastName: varchar("customer_last_name", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  guests: integer("number_of_guests").notNull(),
  revenue: doublePrecision("total_revenue").notNull(),
  profit: doublePrecision('profit').notNull(),
  fee: doublePrecision("fee").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
},(table)=> ({
  startDateidx: index("start_date_idx").on(table.startDate)
}));

// Optional: Export types for use in your Adapter
export type RentalRow = typeof RentalSchema.$inferSelect; 
export type NewRentalRow = typeof RentalSchema.$inferInsert;