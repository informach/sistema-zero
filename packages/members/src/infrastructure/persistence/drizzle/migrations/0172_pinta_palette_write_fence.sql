-- A preceding Members binary shares these tables during deployment. The protected
-- pointer and pending writer cannot be changed by that binary or ordinary row writes.
CREATE FUNCTION members.pinta_palette_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  owner_row members.creations%ROWTYPE;
  pending_active boolean := false;
  adopted boolean;
  verified_writer boolean := coalesce(current_setting('members.pinta_palette_writer', true) = 'palette-cas-v1', false);
BEGIN
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND
       (OLD.item_id = 'sz-pinta-palettes' OR OLD.kind = 'palette-library'))
    THEN owner_row := OLD; ELSE owner_row := NEW; END IF;

  IF TG_OP = 'DELETE' AND EXISTS (
    SELECT 1 FROM members.account_deletion_fences WHERE account_id = owner_row.account_id
  ) THEN RETURN OLD; END IF;

  IF TG_OP <> 'INSERT' AND OLD.pending_palette_write IS NOT NULL THEN
    pending_active := (OLD.pending_palette_write ->> 'expiresAt')::timestamptz > clock_timestamp();
  END IF;
  -- Compacting an invisible row cannot mutate the authoritative profile generation.
  -- This path already owns the row lock, so do not acquire the profile lock here.
  IF TG_OP = 'DELETE' AND OLD.deleted_at IS NOT NULL AND OLD.storage_ref IS NULL
      AND NOT pending_active THEN RETURN OLD; END IF;

  IF verified_writer THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF (NEW.tool, NEW.item_id, NEW.kind)
      IS DISTINCT FROM ('pinta'::members.creation_tool, 'sz-pinta-palettes', 'palette-library') THEN
      RAISE EXCEPTION 'Pinta palette identity is invalid' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND (OLD.id, OLD.user_id, OLD.account_id, OLD.audience, OLD.tool, OLD.item_id, OLD.kind)
      IS DISTINCT FROM (NEW.id, NEW.user_id, NEW.account_id, NEW.audience, NEW.tool, NEW.item_id, NEW.kind) THEN
      RAISE EXCEPTION 'Pinta palette identity is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  -- Services also acquire this lock before taking the creation row lock, as the
  -- legacy quota path does. INSERT gets the lock before the uniqueness check.
  PERFORM pg_advisory_xact_lock(hashtextextended('creation-quota:' || owner_row.user_id::text, 0));
  SELECT palette_generation IS NOT NULL INTO adopted
    FROM members.creation_inventory_floors
    WHERE user_id = owner_row.user_id AND audience = owner_row.audience AND tool = 'pinta';
  IF adopted OR pending_active THEN
    RAISE EXCEPTION 'Pinta palette requires a verified writer' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' AND (NEW.pending_palette_write IS NOT NULL OR NEW.palette_write_receipt IS NOT NULL) THEN
    RAISE EXCEPTION 'Pinta palette ticket requires a verified writer' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.pending_palette_write IS NOT NULL AND
        NEW.pending_palette_write IS DISTINCT FROM OLD.pending_palette_write)
       OR NEW.palette_write_receipt IS DISTINCT FROM OLD.palette_write_receipt THEN
      RAISE EXCEPTION 'Pinta palette ticket requires a verified writer' USING ERRCODE = '23514';
    END IF;
    IF OLD.pending_palette_write IS NOT NULL THEN
      IF NEW.revision IS DISTINCT FROM OLD.revision AND
          NEW.revision = (OLD.pending_palette_write ->> 'revision')::integer THEN
        RAISE EXCEPTION 'Pinta palette reservation expired' USING ERRCODE = '23514';
      END IF;
      IF NEW.pending_revision IS DISTINCT FROM OLD.pending_revision THEN NEW.pending_palette_write := NULL; END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER pinta_palette_insert_fence BEFORE INSERT ON members.creations
  FOR EACH ROW WHEN (NEW.item_id = 'sz-pinta-palettes' OR NEW.kind = 'palette-library')
  EXECUTE FUNCTION members.pinta_palette_write_fence();
--> statement-breakpoint
CREATE TRIGGER pinta_palette_update_fence BEFORE UPDATE ON members.creations
  FOR EACH ROW WHEN (OLD.item_id = 'sz-pinta-palettes' OR NEW.item_id = 'sz-pinta-palettes'
                       OR OLD.kind = 'palette-library' OR NEW.kind = 'palette-library')
  EXECUTE FUNCTION members.pinta_palette_write_fence();
--> statement-breakpoint
CREATE TRIGGER pinta_palette_delete_fence BEFORE DELETE ON members.creations
  FOR EACH ROW WHEN (OLD.item_id = 'sz-pinta-palettes' OR OLD.kind = 'palette-library')
  EXECUTE FUNCTION members.pinta_palette_write_fence();
--> statement-breakpoint
CREATE FUNCTION members.pinta_palette_generation_fence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND EXISTS (
    SELECT 1 FROM members.account_deletion_fences WHERE account_id = OLD.account_id
  ) THEN RETURN OLD; END IF;
  IF TG_OP <> 'DELETE' AND NEW.tool = 'pinta' AND NEW.palette_generation IS NOT NULL
      AND current_setting('members.pinta_palette_writer', true) = 'palette-cas-v1' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Pinta palette generation is permanent' USING ERRCODE = '23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER pinta_palette_generation_insert BEFORE INSERT ON members.creation_inventory_floors
  FOR EACH ROW WHEN (NEW.palette_generation IS NOT NULL)
  EXECUTE FUNCTION members.pinta_palette_generation_fence();
--> statement-breakpoint
CREATE TRIGGER pinta_palette_generation_update BEFORE UPDATE ON members.creation_inventory_floors
  FOR EACH ROW WHEN (OLD.palette_generation IS DISTINCT FROM NEW.palette_generation
    OR (OLD.palette_generation IS NOT NULL AND
        (OLD.user_id, OLD.account_id, OLD.audience, OLD.tool)
        IS DISTINCT FROM (NEW.user_id, NEW.account_id, NEW.audience, NEW.tool)))
  EXECUTE FUNCTION members.pinta_palette_generation_fence();
--> statement-breakpoint
CREATE TRIGGER pinta_palette_generation_delete BEFORE DELETE ON members.creation_inventory_floors
  FOR EACH ROW WHEN (OLD.palette_generation IS NOT NULL)
  EXECUTE FUNCTION members.pinta_palette_generation_fence();
