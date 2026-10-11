import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { UserSchema } from './user-schema';

// Deliberately no request bodies, document contents or other PII in audit rows.
export const ContractAuditEventSchema = pgTable('contract_audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull()
    .references(() => UserSchema.firebaseUid, { onDelete: 'restrict' }),
  actorId: varchar('actor_id', { length: 128 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  targetType: varchar('target_type', { length: 40 }).notNull(),
  targetId: uuid('target_id'),
  outcome: varchar('outcome', { length: 16 }).notNull(),
  requestId: varchar('request_id', { length: 80 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({ ownerIdx: index('contract_audit_events_owner_idx').on(t.userId, t.createdAt),
  outcomeCheck: check('contract_audit_events_outcome_check',sql`${t.outcome} IN ('SUCCESS','DENIED','FAILED')`) }));

// A replay can only refer to an already allocated resource; no response/PII blob.
export const ContractIdempotencySchema = pgTable('contract_idempotency', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull()
    .references(() => UserSchema.firebaseUid, { onDelete: 'restrict' }),
  operation: varchar('operation', { length: 50 }).notNull(),
  requestKey: varchar('request_key', { length: 128 }).notNull(),
  requestSha256: varchar('request_sha256', { length: 64 }).notNull(),
  resourceId: uuid('resource_id'),
  status: varchar('status', { length: 12 }).notNull().default('PENDING'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  uniqueReplay: unique('contract_idempotency_key_unique').on(t.userId, t.operation, t.requestKey),
  expiryIdx: index('contract_idempotency_expiry_idx').on(t.expiresAt),
  statusCheck: check('contract_idempotency_status_check',sql`${t.status} IN ('PENDING','COMPLETED','FAILED')`),
}));
