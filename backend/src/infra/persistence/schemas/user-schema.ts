import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ['staff', 'admin', 'host'])

export const UserSchema = pgTable('users', {
    firebaseUid:varchar('firebase_uid', {length:128}).primaryKey().notNull(),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    role: roleEnum('role').default('host').notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}) 


export type UserRow = typeof UserSchema.$inferSelect; 
export type NewUserRow = typeof UserSchema.$inferInsert;