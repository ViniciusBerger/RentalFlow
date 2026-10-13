-- Task 4.6a: cancellation changes reporting only, without rewriting any contract,
-- installment, guest record or payment receipt. Old endpoints remain protected.
CREATE TABLE "contract_cancellations" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "contract_id" uuid NOT NULL,
 "rental_id" uuid NOT NULL,
 "user_id" varchar(128) NOT NULL,
 "actor_id" varchar(128) NOT NULL,
 "transaction_id" bigint NOT NULL,
 "excluded_revenue_cents" bigint NOT NULL,
 "excluded_profit_cents" bigint NOT NULL,
 "cancelled_at" timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT "contract_cancellations_contract_owner_fk" FOREIGN KEY("contract_id","user_id")
   REFERENCES "contracts"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "contract_cancellations_rental_owner_fk" FOREIGN KEY("rental_id","user_id")
   REFERENCES "rentals"("id","user_id") ON DELETE RESTRICT,
 CONSTRAINT "contract_cancellations_one_per_contract" UNIQUE("contract_id"),
 CONSTRAINT "contract_cancellations_nonnegative_revenue" CHECK ("excluded_revenue_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX "contract_cancellations_owner_idx" ON "contract_cancellations"("user_id","cancelled_at");
--> statement-breakpoint
-- Approval record is immutable. Its transaction ID can authorize ONLY one
-- active->inactive transition for the exact tenant, rental and contract.
-- A record inserted in a different transaction cannot authorize an edit.
CREATE FUNCTION prevent_contract_cancellation_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Contract cancellations are immutable' USING ERRCODE='23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER immutable_contract_cancellations BEFORE UPDATE OR DELETE ON contract_cancellations
 FOR EACH ROW EXECUTE FUNCTION prevent_contract_cancellation_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_finalized_contract_rental_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_contract uuid;
BEGIN
 SELECT c.id INTO linked_contract FROM contracts c WHERE c.rental_id=OLD.id LIMIT 1;
 IF linked_contract IS NOT NULL THEN
  IF TG_OP='DELETE' THEN
   RAISE EXCEPTION 'CONTRACT_REVISION_REQUIRED' USING ERRCODE='23514';
  END IF;
  IF (OLD.property_id,OLD.first_name,OLD.last_name,OLD.start_date,OLD.end_date,
      OLD.number_of_guests,OLD.total_revenue,OLD.fee,OLD.is_active)
     IS DISTINCT FROM
     (NEW.property_id,NEW.first_name,NEW.last_name,NEW.start_date,NEW.end_date,
      NEW.number_of_guests,NEW.total_revenue,NEW.fee,NEW.is_active) THEN
   -- Do not permit anyone to change a contract booking's factual/financial terms.
   -- The only exception is the explicit, single-use cancellation authorization.
   IF NOT (OLD.is_active IS TRUE AND NEW.is_active IS FALSE
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
       )
   ) THEN
    RAISE EXCEPTION 'CONTRACT_REVISION_REQUIRED' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
