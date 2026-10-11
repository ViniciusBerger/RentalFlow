-- Task 4.3: linked draft booking terms cannot be silently modified by legacy endpoints.
-- Require a future contract-aware revision/amendment transaction for ANY linked contract,
-- not only finalized ones. Does not affect rentals with no contract.
CREATE OR REPLACE FUNCTION prevent_finalized_contract_rental_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM contracts c WHERE c.rental_id=OLD.id) AND (
   TG_OP='DELETE'
   OR (OLD.property_id,OLD.first_name,OLD.last_name,OLD.start_date,OLD.end_date,
       OLD.number_of_guests,OLD.total_revenue,OLD.fee,OLD.is_active)
      IS DISTINCT FROM
      (NEW.property_id,NEW.first_name,NEW.last_name,NEW.start_date,NEW.end_date,
       NEW.number_of_guests,NEW.total_revenue,NEW.fee,NEW.is_active)
 ) THEN
   RAISE EXCEPTION 'CONTRACT_REVISION_REQUIRED' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
