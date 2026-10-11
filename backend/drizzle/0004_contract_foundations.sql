-- Task 4.1: additive foundations only. No PII is written and no old bookings are backfilled.
-- Requires 0003 to be applied first. Deploy before code that uses these tables.
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_id_owner_unique" UNIQUE ("id", "user_id");
--> statement-breakpoint
CREATE TABLE "contract_settings" (
 "user_id" varchar(128) PRIMARY KEY NOT NULL REFERENCES "users"("firebase_uid") ON DELETE RESTRICT,
 "profile_ciphertext" bytea,
 "profile_nonce" bytea,
 "profile_auth_tag" bytea,
 "profile_key_version" varchar(32),
 "policy_config" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "payment_defaults" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contract_settings_crypto_complete" CHECK (
   (profile_ciphertext IS NULL AND profile_nonce IS NULL AND profile_auth_tag IS NULL AND profile_key_version IS NULL)
   OR (profile_ciphertext IS NOT NULL AND profile_nonce IS NOT NULL AND profile_auth_tag IS NOT NULL AND profile_key_version IS NOT NULL)
 )
);
--> statement-breakpoint
CREATE TABLE "property_contract_settings" (
 "property_id" uuid PRIMARY KEY NOT NULL,
 "user_id" varchar(128) NOT NULL,
 "included_occupancy" integer,
 "maximum_occupancy" integer,
 "extra_guest_rate_cents" integer,
 "check_in_time" time,
 "check_out_time" time,
 "provides_linen" boolean,
 "has_pool" boolean,
 "house_rules" jsonb NOT NULL DEFAULT '[]'::jsonb,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "property_contract_settings_owner_fk" FOREIGN KEY("property_id","user_id") REFERENCES "properties"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "property_contract_settings_capacity_check" CHECK (
   (included_occupancy IS NULL AND maximum_occupancy IS NULL AND extra_guest_rate_cents IS NULL)
   OR (included_occupancy > 0 AND maximum_occupancy >= included_occupancy AND extra_guest_rate_cents >= 0)
 ),
 CONSTRAINT "property_contract_settings_house_rules_array" CHECK (jsonb_typeof(house_rules) = 'array')
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "user_id" varchar(128) NOT NULL REFERENCES "users"("firebase_uid") ON DELETE RESTRICT,
 "name" varchar(120) NOT NULL,
 "is_default" boolean NOT NULL DEFAULT false,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contract_templates_id_owner_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE INDEX "contract_templates_owner_idx" ON "contract_templates"("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "contract_templates_one_default_owner" ON "contract_templates"("user_id") WHERE "is_default" = true;
--> statement-breakpoint
CREATE TABLE "contract_template_versions" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "template_id" uuid NOT NULL,
 "user_id" varchar(128) NOT NULL,
 "version_number" integer NOT NULL,
 "status" varchar(12) NOT NULL DEFAULT 'DRAFT',
 "clauses" jsonb NOT NULL DEFAULT '[]'::jsonb,
 "policy_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "published_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contract_template_versions_owner_fk" FOREIGN KEY("template_id","user_id") REFERENCES "contract_templates"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "contract_template_versions_id_owner_unique" UNIQUE("id","user_id"),
 CONSTRAINT "contract_template_versions_number_unique" UNIQUE("template_id","version_number"),
 CONSTRAINT "contract_template_versions_positive_version" CHECK (version_number >= 1),
 CONSTRAINT "contract_template_versions_status_check" CHECK (
   (status = 'DRAFT' AND published_at IS NULL) OR (status = 'PUBLISHED' AND published_at IS NOT NULL)
 ),
 CONSTRAINT "contract_template_versions_clauses_array" CHECK (jsonb_typeof(clauses) = 'array')
);
--> statement-breakpoint
CREATE INDEX "contract_template_versions_owner_idx" ON "contract_template_versions"("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "contract_template_versions_one_draft" ON "contract_template_versions"("template_id") WHERE status = 'DRAFT';
--> statement-breakpoint
CREATE TABLE "rental_guest_details" (
 "rental_id" uuid PRIMARY KEY NOT NULL,
 "user_id" varchar(128) NOT NULL,
 "identity_ciphertext" bytea,
 "identity_nonce" bytea,
 "identity_auth_tag" bytea,
 "identity_key_version" varchar(32),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "rental_guest_details_owner_fk" FOREIGN KEY("rental_id","user_id") REFERENCES "rentals"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "rental_guest_details_rental_owner_unique" UNIQUE ("rental_id","user_id"),
 CONSTRAINT "rental_guest_details_crypto_complete" CHECK (
   (identity_ciphertext IS NULL AND identity_nonce IS NULL AND identity_auth_tag IS NULL AND identity_key_version IS NULL)
   OR (identity_ciphertext IS NOT NULL AND identity_nonce IS NOT NULL AND identity_auth_tag IS NOT NULL AND identity_key_version IS NOT NULL)
 )
);
--> statement-breakpoint
CREATE TABLE "rental_installments" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "rental_id" uuid NOT NULL,
 "user_id" varchar(128) NOT NULL,
 "sequence" integer NOT NULL,
 "agreed_cents" integer NOT NULL,
 "due_date" date,
 "due_event" varchar(32),
 "payment_method" varchar(40),
 "is_deposit" boolean NOT NULL DEFAULT false,
 "received_cents" integer NOT NULL DEFAULT 0,
 "paid_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "rental_installments_owner_fk" FOREIGN KEY("rental_id","user_id") REFERENCES "rentals"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "rental_installments_sequence_unique" UNIQUE ("rental_id","sequence"),
 CONSTRAINT "rental_installments_amount_check" CHECK (agreed_cents >= 0 AND received_cents >= 0 AND received_cents <= agreed_cents),
 CONSTRAINT "rental_installments_sequence_check" CHECK (sequence BETWEEN 1 AND 12),
 CONSTRAINT "rental_installments_due_check" CHECK (due_date IS NULL OR due_event IS NULL),
 CONSTRAINT "rental_installments_event_check" CHECK (due_event IS NULL OR due_event IN ('CHECKIN','KEY_HANDOVER','AGREED_EVENT'))
);
--> statement-breakpoint
CREATE INDEX "rental_installments_owner_idx" ON "rental_installments"("user_id","rental_id");
--> statement-breakpoint
CREATE TABLE "contracts" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "rental_id" uuid NOT NULL,
 CONSTRAINT "contracts_rental_id_unique" UNIQUE("rental_id"),
 "user_id" varchar(128) NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contracts_rental_owner_fk" FOREIGN KEY("rental_id","user_id") REFERENCES "rentals"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "contracts_id_owner_unique" UNIQUE ("id","user_id")
);
--> statement-breakpoint
CREATE INDEX "contracts_owner_idx" ON "contracts"("user_id");
--> statement-breakpoint
CREATE TABLE "contract_revisions" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "contract_id" uuid NOT NULL,
 "user_id" varchar(128) NOT NULL,
 "template_version_id" uuid,
 "version_number" integer NOT NULL,
 "status" varchar(12) NOT NULL DEFAULT 'DRAFT',
 "snapshot_ciphertext" bytea,
 "snapshot_nonce" bytea,
 "snapshot_auth_tag" bytea,
 "snapshot_key_version" varchar(32),
 "snapshot_sha256" varchar(64),
 "pdf_ciphertext" bytea,
 "pdf_nonce" bytea,
 "pdf_auth_tag" bytea,
 "pdf_key_version" varchar(32),
 "pdf_sha256" varchar(64),
 "finalized_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contract_revisions_owner_fk" FOREIGN KEY("contract_id","user_id") REFERENCES "contracts"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "contract_revisions_template_owner_fk" FOREIGN KEY("template_version_id","user_id") REFERENCES "contract_template_versions"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "contract_revisions_number_unique" UNIQUE ("contract_id","version_number"),
 CONSTRAINT "contract_revisions_positive_version" CHECK (version_number >= 1),
 CONSTRAINT "contract_revisions_status_check" CHECK (status IN ('DRAFT','READY','FINALIZED')),
 CONSTRAINT "contract_revisions_snapshot_crypto_complete" CHECK (
   (snapshot_ciphertext IS NULL AND snapshot_nonce IS NULL AND snapshot_auth_tag IS NULL AND snapshot_key_version IS NULL AND snapshot_sha256 IS NULL)
   OR (snapshot_ciphertext IS NOT NULL AND snapshot_nonce IS NOT NULL AND snapshot_auth_tag IS NOT NULL AND snapshot_key_version IS NOT NULL AND snapshot_sha256 IS NOT NULL)
 ),
 CONSTRAINT "contract_revisions_pdf_crypto_complete" CHECK (
   (pdf_ciphertext IS NULL AND pdf_nonce IS NULL AND pdf_auth_tag IS NULL AND pdf_key_version IS NULL AND pdf_sha256 IS NULL)
   OR (pdf_ciphertext IS NOT NULL AND pdf_nonce IS NOT NULL AND pdf_auth_tag IS NOT NULL AND pdf_key_version IS NOT NULL AND pdf_sha256 IS NOT NULL)
 ),
 CONSTRAINT "contract_revisions_finalized_complete" CHECK (
   status <> 'FINALIZED' OR (finalized_at IS NOT NULL AND template_version_id IS NOT NULL
   AND snapshot_ciphertext IS NOT NULL AND pdf_ciphertext IS NOT NULL)
 )
);
--> statement-breakpoint
CREATE INDEX "contract_revisions_owner_idx" ON "contract_revisions"("user_id","contract_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "contract_revisions_one_open" ON "contract_revisions"("contract_id") WHERE status IN ('DRAFT','READY');
--> statement-breakpoint
-- A finalized version can never be changed or deleted, even through a legacy endpoint.
CREATE FUNCTION prevent_contract_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status = 'FINALIZED' THEN
  RAISE EXCEPTION 'Finalized contract revisions are immutable' USING ERRCODE = '23514';
 END IF;
 RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER protect_finalized_contract_revision BEFORE UPDATE OR DELETE ON "contract_revisions"
 FOR EACH ROW EXECUTE FUNCTION prevent_contract_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION prevent_published_template_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status = 'PUBLISHED' THEN
  RAISE EXCEPTION 'Published contract templates are immutable' USING ERRCODE = '23514';
 END IF;
 RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER protect_published_contract_template BEFORE UPDATE OR DELETE ON "contract_template_versions"
 FOR EACH ROW EXECUTE FUNCTION prevent_published_template_mutation();
--> statement-breakpoint
CREATE TABLE "contract_audit_events" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "user_id" varchar(128) NOT NULL REFERENCES "users"("firebase_uid") ON DELETE RESTRICT,
 "actor_id" varchar(128) NOT NULL,
 "action" varchar(64) NOT NULL,
 "target_type" varchar(40) NOT NULL,
 "target_id" uuid,
 "outcome" varchar(16) NOT NULL,
 "request_id" varchar(80),
 "created_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contract_audit_events_outcome_check" CHECK (outcome IN ('SUCCESS','DENIED','FAILED'))
);
--> statement-breakpoint
CREATE INDEX "contract_audit_events_owner_idx" ON "contract_audit_events"("user_id","created_at");
--> statement-breakpoint
CREATE TABLE "contract_idempotency" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "user_id" varchar(128) NOT NULL REFERENCES "users"("firebase_uid") ON DELETE RESTRICT,
 "operation" varchar(50) NOT NULL,
 "request_key" varchar(128) NOT NULL,
 "request_sha256" varchar(64) NOT NULL,
 "resource_id" uuid,
 "status" varchar(12) NOT NULL DEFAULT 'PENDING',
 "expires_at" timestamptz NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contract_idempotency_key_unique" UNIQUE("user_id","operation","request_key"),
 CONSTRAINT "contract_idempotency_status_check" CHECK (status IN ('PENDING','COMPLETED','FAILED'))
);
--> statement-breakpoint
CREATE INDEX "contract_idempotency_expiry_idx" ON "contract_idempotency"("expires_at");
--> statement-breakpoint
