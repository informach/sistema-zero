-- Legacy Members processes can share the table during a rolling deployment. They cannot
-- publish behind a protected graph, or leave an old certified manifest on replaced bytes.
CREATE FUNCTION members.pinta_graph_individual_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  owner_row members.creations%ROWTYPE;
  old_alive boolean := false;
  new_alive boolean := false;
  indexed_change boolean := false;
  protected boolean;
  data_floor integer := 1;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.user_id,OLD.account_id,OLD.audience,OLD.tool,OLD.item_id)
       IS DISTINCT FROM (NEW.user_id,NEW.account_id,NEW.audience,NEW.tool,NEW.item_id) THEN
    RAISE EXCEPTION 'Pinta ownership and creation identity are immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP = 'DELETE' THEN owner_row := OLD; ELSE owner_row := NEW; END IF;
  IF owner_row.tool <> 'pinta' OR owner_row.item_id = 'sz-pinta-palettes'
     OR current_setting('members.pinta_graph_writer',true) = 'unit-v1' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP <> 'INSERT' THEN old_alive := OLD.deleted_at IS NULL AND OLD.storage_ref IS NOT NULL; END IF;
  IF TG_OP <> 'DELETE' THEN new_alive := NEW.deleted_at IS NULL AND NEW.storage_ref IS NOT NULL; END IF;
  -- Account deletion has installed its permanent fence under this same quota lock.
  IF TG_OP = 'DELETE' AND EXISTS (
    SELECT 1 FROM members.account_deletion_fences WHERE account_id=owner_row.account_id
  ) THEN RETURN OLD; END IF;
  -- Physical compaction of an already invisible row cannot change the snapshot.
  IF TG_OP = 'DELETE' AND NOT old_alive AND OLD.pending_unit IS NULL THEN RETURN OLD; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('creation-quota:' || owner_row.user_id::text,0));
  SELECT requires_causal_read INTO protected FROM members.creation_inventory_floors
    WHERE user_id=owner_row.user_id AND audience=owner_row.audience AND tool='pinta';
  IF protected OR (TG_OP <> 'INSERT' AND OLD.pending_unit IS NOT NULL) THEN
    RAISE EXCEPTION 'Pinta gallery requires causal protocol' USING ERRCODE='23514';
  END IF;
  IF old_alive <> new_alive THEN indexed_change := true;
  ELSIF TG_OP='UPDATE' AND new_alive THEN
    indexed_change := (OLD.revision,OLD.storage_ref,OLD.name,OLD.kind,OLD.bytes,OLD.format_version,OLD.item_updated_at)
      IS DISTINCT FROM (NEW.revision,NEW.storage_ref,NEW.name,NEW.kind,NEW.bytes,NEW.format_version,NEW.item_updated_at);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    data_floor := greatest(NEW.format_version,coalesce(NEW.pending_format_version,1));
    IF data_floor < 7 THEN data_floor := 1; END IF;
  END IF;
  IF indexed_change OR data_floor > 1 THEN
    INSERT INTO members.creation_inventory_floors(user_id,account_id,audience,tool,required_version,graph_epoch)
      VALUES(owner_row.user_id,owner_row.account_id,owner_row.audience,'pinta',data_floor,CASE WHEN indexed_change THEN 1 ELSE 0 END)
      ON CONFLICT(user_id,audience,tool) DO UPDATE
        SET graph_epoch=members.creation_inventory_floors.graph_epoch+excluded.graph_epoch,
            required_version=greatest(members.creation_inventory_floors.required_version,excluded.required_version);
    IF indexed_change AND TG_OP <> 'DELETE' THEN
      NEW.causal_manifest := NULL; NEW.causal_sha256 := NULL; NEW.layout_revision := NULL; NEW.backfill_ticket := NULL;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER pinta_graph_insert_fence BEFORE INSERT ON members.creations
  FOR EACH ROW WHEN (NEW.tool='pinta' AND NEW.item_id<>'sz-pinta-palettes')
  EXECUTE FUNCTION members.pinta_graph_individual_write();
--> statement-breakpoint
CREATE TRIGGER pinta_graph_update_fence BEFORE UPDATE ON members.creations
  FOR EACH ROW WHEN ((OLD.tool='pinta' AND OLD.item_id<>'sz-pinta-palettes')
                   OR (NEW.tool='pinta' AND NEW.item_id<>'sz-pinta-palettes'))
  EXECUTE FUNCTION members.pinta_graph_individual_write();
--> statement-breakpoint
CREATE TRIGGER pinta_graph_delete_fence BEFORE DELETE ON members.creations
  FOR EACH ROW WHEN (OLD.tool='pinta' AND OLD.item_id<>'sz-pinta-palettes')
  EXECUTE FUNCTION members.pinta_graph_individual_write();