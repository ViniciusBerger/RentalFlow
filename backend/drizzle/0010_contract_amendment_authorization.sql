-- Task 4.6b: append-only landlord-approved amendment; original finalized revision remains untouched.
-- old/new state contain dates, occupancy, property IDs and integer centavos ONLY.
CREATE TABLE "contract_amendments" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "contract_id" uuid NOT NULL,
 "rental_id" uuid NOT NULL,
 "user_id" varchar(128) NOT NULL,
 "actor_id" varchar(128) NOT NULL,
 "from_revision_id" uuid NOT NULL REFERENCES "contract_revisions"("id") ON DELETE RESTRICT,
 "to_revision_id" uuid NOT NULL REFERENCES "contract_revisions"("id") ON DELETE RESTRICT,
 "transaction_id" bigint NOT NULL,
 "before_facts" jsonb NOT NULL,
 "after_facts" jsonb NOT NULL,
 "payment_changed" boolean NOT NULL DEFAULT false,
 "approved_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contract_amendments_contract_owner_fk" FOREIGN KEY ("contract_id","user_id") REFERENCES "contracts"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "contract_amendments_rental_owner_fk" FOREIGN KEY ("rental_id","user_id") REFERENCES "rentals"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "contract_amendments_new_revision_unique" UNIQUE ("to_revision_id"),
 CONSTRAINT "contract_amendments_valid_facts" CHECK (jsonb_typeof(before_facts)='object' AND jsonb_typeof(after_facts)='object' AND before_facts<>after_facts)
);
--> statement-breakpoint
CREATE INDEX "contract_amendments_owner_idx" ON contract_amendments(user_id,approved_at);
--> statement-breakpoint
CREATE TRIGGER immutable_contract_amendments BEFORE UPDATE OR DELETE ON contract_amendments
 FOR EACH ROW EXECUTE FUNCTION prevent_contract_cancellation_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_finalized_contract_rental_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_contract uuid;
DECLARE old_facts jsonb;
DECLARE new_facts jsonb;
BEGIN
 SELECT c.id INTO linked_contract FROM contracts c WHERE c.rental_id=OLD.id LIMIT 1;
 IF linked_contract IS NOT NULL THEN
  IF TG_OP='DELETE' THEN
   RAISE EXCEPTION 'CONTRACT_REVISION_REQUIRED' USING ERRCODE='23514';
  END IF;
  IF (OLD.property_id,OLD.first_name,OLD.last_name,OLD.start_date,OLD.end_date,
      OLD.number_of_guests,OLD.total_revenue,OLD.fee,OLD.profit,OLD.is_active)
     IS DISTINCT FROM
     (NEW.property_id,NEW.first_name,NEW.last_name,NEW.start_date,NEW.end_date,
      NEW.number_of_guests,NEW.total_revenue,NEW.fee,NEW.profit,NEW.is_active) THEN
   IF OLD.is_active IS TRUE AND NEW.is_active IS FALSE
       AND (OLD.property_id,OLD.first_name,OLD.last_name,OLD.start_date,OLD.end_date,
            OLD.number_of_guests,OLD.total_revenue,OLD.fee,OLD.profit)
           IS NOT DISTINCT FROM
           (NEW.property_id,NEW.first_name,NEW.last_name,NEW.start_date,NEW.end_date,
            NEW.number_of_guests,NEW.total_revenue,NEW.fee,NEW.profit)
       AND EXISTS (
        SELECT 1 FROM contract_cancellations cc WHERE cc.contract_id=linked_contract
          AND cc.rental_id=OLD.id AND cc.user_id=OLD.user_id
          AND cc.transaction_id=txid_current()
          AND cc.excluded_revenue_cents=round((OLD.total_revenue*100)::numeric)::bigint
          AND cc.excluded_profit_cents=round((OLD.profit*100)::numeric)::bigint
       ) THEN RETURN NEW;
   END IF;
   old_facts=jsonb_build_object('propertyId',OLD.property_id,'startDate',OLD.start_date,
     'endDate',OLD.end_date,'guests',OLD.number_of_guests,
     'revenueCents',round((OLD.total_revenue*100)::numeric)::bigint,
     'feeCents',round((OLD.fee*100)::numeric)::bigint,
     'profitCents',round((OLD.profit*100)::numeric)::bigint);
   new_facts=jsonb_build_object('propertyId',NEW.property_id,'startDate',NEW.start_date,
     'endDate',NEW.end_date,'guests',NEW.number_of_guests,
     'revenueCents',round((NEW.total_revenue*100)::numeric)::bigint,
     'feeCents',round((NEW.fee*100)::numeric)::bigint,
     'profitCents',round((NEW.profit*100)::numeric)::bigint);
   IF NOT (OLD.is_active IS TRUE AND NEW.is_active IS TRUE
       AND (OLD.first_name,OLD.last_name) IS NOT DISTINCT FROM (NEW.first_name,NEW.last_name)
       AND EXISTS (
        SELECT 1 FROM contract_amendments ca WHERE ca.contract_id=linked_contract
          AND ca.rental_id=OLD.id AND ca.user_id=OLD.user_id
          AND ca.transaction_id=txid_current()
          AND ca.before_facts=old_facts AND ca.after_facts=new_facts
       )
   ) THEN RAISE EXCEPTION 'CONTRACT_REVISION_REQUIRED' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Guest identity is not part of a booking-terms amendment; keep fully protected.
-- Payment schedule may be replaced only for a same-transaction owner-approved amendment.
CREATE OR REPLACE FUNCTION protect_finalized_contract_terms() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rental_uuid uuid;
DECLARE actor_uid varchar(128);
DECLARE permitted boolean;
BEGIN
 IF TG_OP='INSERT' THEN rental_uuid:=NEW.rental_id; actor_uid:=NEW.user_id;
 ELSE rental_uuid:=OLD.rental_id; actor_uid:=OLD.user_id; END IF;
 IF EXISTS (SELECT 1 FROM contracts c JOIN contract_revisions cr ON cr.contract_id=c.id
            WHERE c.rental_id=rental_uuid AND cr.status='FINALIZED') THEN
  IF TG_TABLE_NAME='rental_guest_details' THEN
   RAISE EXCEPTION 'CONTRACT_AMENDMENT_REQUIRED' USING ERRCODE='23514';
  END IF;
  SELECT EXISTS(SELECT 1 FROM contract_amendments a WHERE a.rental_id=rental_uuid
    AND a.user_id=actor_uid AND a.transaction_id=txid_current()
    AND a.payment_changed IS TRUE) INTO permitted;
  IF TG_OP='UPDATE' AND
     (OLD.rental_id,OLD.user_id,OLD.sequence,OLD.agreed_cents,OLD.due_date,
      OLD.due_event,OLD.payment_method,OLD.is_deposit) IS NOT DISTINCT FROM
     (NEW.rental_id,NEW.user_id,NEW.sequence,NEW.agreed_cents,NEW.due_date,
      NEW.due_event,NEW.payment_method,NEW.is_deposit)
  THEN RETURN NEW; END IF;
  IF NOT permitted THEN
   RAISE EXCEPTION 'CONTRACT_AMENDMENT_REQUIRED' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' AND (OLD.received_cents<>0 OR OLD.paid_at IS NOT NULL) THEN
   RAISE EXCEPTION 'PAID_INSTALLMENT_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND (OLD.received_cents<>0 OR OLD.paid_at IS NOT NULL) THEN
   RAISE EXCEPTION 'PAID_INSTALLMENT_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' AND (NEW.received_cents<>0 OR NEW.paid_at IS NOT NULL) THEN
   RAISE EXCEPTION 'PAYMENT_RECEIPT_CANNOT_BE_CREATED' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
