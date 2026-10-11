-- Defense in depth for legacy rental endpoints. No guest records are created.
-- Prevent old API routes from silently changing the factual basis of a finalized contract.
CREATE FUNCTION prevent_finalized_contract_rental_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM contracts c JOIN contract_revisions cr ON cr.contract_id=c.id
   WHERE c.rental_id=OLD.id AND cr.status='FINALIZED'
 ) AND (
   TG_OP='DELETE'
   OR (OLD.property_id, OLD.first_name, OLD.last_name, OLD.start_date, OLD.end_date,
       OLD.number_of_guests, OLD.total_revenue, OLD.fee, OLD.is_active)
      IS DISTINCT FROM
      (NEW.property_id, NEW.first_name, NEW.last_name, NEW.start_date, NEW.end_date,
       NEW.number_of_guests, NEW.total_revenue, NEW.fee, NEW.is_active)
 ) THEN
   RAISE EXCEPTION 'CONTRACT_AMENDMENT_REQUIRED' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER finalized_contract_rental_guard BEFORE UPDATE OR DELETE ON rentals
 FOR EACH ROW EXECUTE FUNCTION prevent_finalized_contract_rental_changes();
--> statement-breakpoint
-- Audit entries are append-only through the application role.
CREATE FUNCTION prevent_contract_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Contract security audit records are append-only' USING ERRCODE='23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER immutable_contract_audit BEFORE UPDATE OR DELETE ON contract_audit_events
 FOR EACH ROW EXECUTE FUNCTION prevent_contract_audit_mutation();
