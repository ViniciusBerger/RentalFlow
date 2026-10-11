import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, pgTable, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { ContractSchema } from './contract-schema';
import { ContractTemplateVersionSchema } from './contract-template-version-schema';
import { encryptedBytes } from './encrypted-column';

export const ContractRevisionSchema = pgTable('contract_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  templateVersionId: uuid('template_version_id'),
  versionNumber: integer('version_number').notNull(),
  status: varchar('status', { length: 12 }).notNull().default('DRAFT'),
  // Snapshot may contain identity and banking details: never JSONB/plaintext.
  snapshotCiphertext: encryptedBytes('snapshot_ciphertext'),
  snapshotNonce: encryptedBytes('snapshot_nonce'),
  snapshotAuthTag: encryptedBytes('snapshot_auth_tag'),
  snapshotKeyVersion: varchar('snapshot_key_version', { length: 32 }),
  snapshotSha256: varchar('snapshot_sha256', { length: 64 }),
  pdfCiphertext: encryptedBytes('pdf_ciphertext'),
  pdfNonce: encryptedBytes('pdf_nonce'),
  pdfAuthTag: encryptedBytes('pdf_auth_tag'),
  pdfKeyVersion: varchar('pdf_key_version', { length: 32 }),
  pdfSha256: varchar('pdf_sha256', { length: 64 }),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  contractOwnerFk: foreignKey({ columns: [t.contractId, t.userId],
    foreignColumns: [ContractSchema.id, ContractSchema.userId],
    name: 'contract_revisions_owner_fk' }).onDelete('restrict'),
  templateOwnerFk: foreignKey({ columns: [t.templateVersionId, t.userId],
    foreignColumns: [ContractTemplateVersionSchema.id, ContractTemplateVersionSchema.userId],
    name: 'contract_revisions_template_owner_fk' }).onDelete('restrict'),
  versionUnique: unique('contract_revisions_number_unique').on(t.contractId, t.versionNumber),
  oneOpen: uniqueIndex('contract_revisions_one_open').on(t.contractId).where(sql`${t.status} IN ('DRAFT','READY')`),
  versionCheck: check('contract_revisions_positive_version',sql`${t.versionNumber} >= 1`),
  statusCheck: check('contract_revisions_status_check',sql`${t.status} IN ('DRAFT','READY','FINALIZED')`),
  ownerIdx: index('contract_revisions_owner_idx').on(t.userId, t.contractId),
}));
