-- Task 4.5: preserve agreed guest identity and financial terms after finalization.
-- Received-payment bookkeeping may continue; original installment terms may not change.
CREATE FUNCTION protect_finalized_contract_terms() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rental_uuid uuid;
BEGIN
 IF TG_OP = 'INSERT' THEN rental_uuid := NEW.rental_id;
 ELSE rental_uuid := OLD.rental_id; END IF;
 IF EXISTS (SELECT 1 FROM contracts c JOIN contract_revisions cr ON cr.contract_id=c.id
            WHERE c.rental_id=rental_uuid AND cr.status='FINALIZED') THEN
  IF TG_TABLE_NAME='rental_guest_details' OR TG_OP IN ('INSERT','DELETE') THEN
   RAISE EXCEPTION 'CONTRACT_AMENDMENT_REQUIRED' USING ERRCODE='23514';
  END IF;
  IF (OLD.rental_id,OLD.user_id,OLD.sequence,OLD.agreed_cents,OLD.due_date,
      OLD.due_event,OLD.payment_method,OLD.is_deposit) IS DISTINCT FROM
     (NEW.rental_id,NEW.user_id,NEW.sequence,NEW.agreed_cents,NEW.due_date,
      NEW.due_event,NEW.payment_method,NEW.is_deposit) THEN
   RAISE EXCEPTION 'CONTRACT_AMENDMENT_REQUIRED' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER finalized_contract_guest_terms_guard
 BEFORE INSERT OR UPDATE OR DELETE ON rental_guest_details
 FOR EACH ROW EXECUTE FUNCTION protect_finalized_contract_terms();
--> statement-breakpoint
CREATE TRIGGER finalized_contract_installment_terms_guard
 BEFORE INSERT OR UPDATE OR DELETE ON rental_installments
 FOR EACH ROW EXECUTE FUNCTION protect_finalized_contract_terms();
