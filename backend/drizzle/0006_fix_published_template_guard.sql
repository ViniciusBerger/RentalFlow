-- Task 4.2: 0004 trigger erroneously returned OLD for allowed DRAFT edits,
-- silently preventing DRAFT -> PUBLISHED transitions.
-- Preserve immutability: only the OLD row's PUBLISHED status is a blocker.
CREATE OR REPLACE FUNCTION prevent_published_template_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status = 'PUBLISHED' THEN
   RAISE EXCEPTION 'Published contract templates are immutable' USING ERRCODE = '23514';
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
