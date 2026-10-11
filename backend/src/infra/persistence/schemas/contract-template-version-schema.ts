import { sql } from 'drizzle-orm';
import { foreignKey, index, jsonb, integer, pgTable, timestamp, unique, uniqueIndex, check, uuid, varchar } from 'drizzle-orm/pg-core';
import { ContractTemplateSchema } from './contract-template-schema';

export const ContractTemplateVersionSchema = pgTable('contract_template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  versionNumber: integer('version_number').notNull(),
  status: varchar('status', { length: 12 }).notNull().default('DRAFT'),
  clauses: jsonb('clauses').$type<Record<string, unknown>[]>().notNull().default([]),
  policySnapshot: jsonb('policy_snapshot').$type<Record<string, unknown>>().notNull().default({}),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  templateOwnerFk: foreignKey({ columns: [t.templateId, t.userId],
    foreignColumns: [ContractTemplateSchema.id, ContractTemplateSchema.userId],
    name: 'contract_template_versions_owner_fk' }).onDelete('restrict'),
  versionUnique: unique('contract_template_versions_number_unique').on(t.templateId, t.versionNumber),
  idOwnerUnique: unique('contract_template_versions_id_owner_unique').on(t.id, t.userId),
  oneDraft: uniqueIndex('contract_template_versions_one_draft').on(t.templateId).where(sql`${t.status} = 'DRAFT'`),
  statusCheck: check('contract_template_versions_status_check',sql`(${t.status} = 'DRAFT' AND ${t.publishedAt} IS NULL) OR (${t.status} = 'PUBLISHED' AND ${t.publishedAt} IS NOT NULL)`),
  versionCheck: check('contract_template_versions_positive_version',sql`${t.versionNumber} >= 1`),
  ownerIdx: index('contract_template_versions_owner_idx').on(t.userId),
}));
