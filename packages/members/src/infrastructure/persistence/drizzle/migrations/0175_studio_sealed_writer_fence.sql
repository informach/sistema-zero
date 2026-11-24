-- Rolling deploy guard for binaries that still write numbered Studio pointers.
CREATE FUNCTION members.studio_sealed_creation_fence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  owner_row members.creations%ROWTYPE;
  adopted boolean := false;
  pending_active boolean := false;
  verified boolean := coalesce(current_setting('members.studio_sealed_writer', true) = 'studio-sealed-v1', false);
BEGIN
  IF TG_OP = 'DELETE' THEN owner_row := OLD; ELSE owner_row := NEW; END IF;
  IF TG_OP <> 'INSERT' AND OLD.pending_studio_seal IS NOT NULL THEN
    pending_active := (OLD.pending_studio_seal->>'expiresAt')::timestamptz > clock_timestamp();
  END IF;
  IF TG_OP = 'DELETE' AND (
    EXISTS (SELECT 1 FROM members.account_deletion_fences WHERE account_id = owner_row.account_id)
    OR (OLD.deleted_at IS NOT NULL AND OLD.storage_ref IS NULL AND OLD.studio_seal_receipt IS NULL AND NOT pending_active)
  ) THEN RETURN OLD; END IF;

  IF TG_OP = 'UPDATE' AND (OLD.id, OLD.user_id, OLD.account_id, OLD.audience, OLD.tool, OLD.item_id)
      IS DISTINCT FROM (NEW.id, NEW.user_id, NEW.account_id, NEW.audience, NEW.tool, NEW.item_id)
      AND (OLD.studio_seal_receipt IS NOT NULL OR OLD.pending_studio_seal IS NOT NULL
        OR NEW.studio_seal_receipt IS NOT NULL OR NEW.pending_studio_seal IS NOT NULL
        OR EXISTS (SELECT 1 FROM members.studio_sealed_heads h
          WHERE (OLD.tool = 'studio' AND (h.user_id,h.audience,h.item_id) = (OLD.user_id,OLD.audience,OLD.item_id))
             OR (NEW.tool = 'studio' AND (h.user_id,h.audience,h.item_id) = (NEW.user_id,NEW.audience,NEW.item_id)))) THEN
    RAISE EXCEPTION 'Sealed Studio identity is immutable' USING ERRCODE = '23514';
  END IF;

  IF verified THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.tool <> 'studio' THEN
      RAISE EXCEPTION 'Sealed Studio writer has an invalid scope' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM members.studio_sealed_heads h
    WHERE owner_row.tool = 'studio' AND (h.user_id,h.audience,h.item_id) = (owner_row.user_id,owner_row.audience,owner_row.item_id))
    INTO adopted;
  IF adopted OR pending_active OR (TG_OP <> 'INSERT' AND OLD.studio_seal_receipt IS NOT NULL) THEN
    RAISE EXCEPTION 'Studio write requires a verified writer' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' AND (NEW.pending_studio_seal IS NOT NULL OR NEW.studio_seal_receipt IS NOT NULL OR NEW.studio_seal_proof_sha256 IS NOT NULL) THEN
    RAISE EXCEPTION 'Studio write requires a verified ticket' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.pending_studio_seal IS NOT NULL AND NEW.pending_studio_seal IS DISTINCT FROM OLD.pending_studio_seal)
      OR NEW.studio_seal_receipt IS DISTINCT FROM OLD.studio_seal_receipt
      OR NEW.studio_seal_proof_sha256 IS DISTINCT FROM OLD.studio_seal_proof_sha256 THEN
      RAISE EXCEPTION 'Studio write requires a verified ticket' USING ERRCODE = '23514';
    END IF;
    IF OLD.pending_studio_seal IS NOT NULL THEN
      IF NEW.revision IS DISTINCT FROM OLD.revision AND NEW.revision = (OLD.pending_studio_seal->>'revision')::integer THEN
        RAISE EXCEPTION 'Studio reservation expired' USING ERRCODE = '23514';
      END IF;
      IF (NEW.pending_revision,NEW.last_reserved_revision) IS DISTINCT FROM (OLD.pending_revision,OLD.last_reserved_revision) THEN
        NEW.pending_studio_seal := NULL;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER studio_sealed_insert_fence BEFORE INSERT ON members.creations
  FOR EACH ROW WHEN (NEW.tool = 'studio') EXECUTE FUNCTION members.studio_sealed_creation_fence();
--> statement-breakpoint
CREATE TRIGGER studio_sealed_update_fence BEFORE UPDATE ON members.creations
  FOR EACH ROW WHEN (OLD.tool = 'studio' OR NEW.tool = 'studio') EXECUTE FUNCTION members.studio_sealed_creation_fence();
--> statement-breakpoint
CREATE TRIGGER studio_sealed_delete_fence BEFORE DELETE ON members.creations
  FOR EACH ROW WHEN (OLD.tool = 'studio') EXECUTE FUNCTION members.studio_sealed_creation_fence();
--> statement-breakpoint
CREATE FUNCTION members.studio_sealed_head_fence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND EXISTS (SELECT 1 FROM members.account_deletion_fences WHERE account_id = OLD.account_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP <> 'DELETE' AND current_setting('members.studio_sealed_writer', true) = 'studio-sealed-v1' THEN
    IF TG_OP = 'UPDATE' AND (OLD.user_id,OLD.account_id,OLD.audience,OLD.item_id)
        IS DISTINCT FROM (NEW.user_id,NEW.account_id,NEW.audience,NEW.item_id) THEN
      RAISE EXCEPTION 'Sealed Studio owner is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Sealed Studio authority is permanent' USING ERRCODE = '23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER studio_sealed_head_write_fence BEFORE INSERT OR UPDATE OR DELETE ON members.studio_sealed_heads
  FOR EACH ROW EXECUTE FUNCTION members.studio_sealed_head_fence();
