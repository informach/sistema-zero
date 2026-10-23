-- Only proven new, unpublished terminal intents. Legacy references and thread moderation
-- use a different cleanup contract and never acquire ownership from this migration.
DO $$
DECLARE
  candidate record;
  parsed_context jsonb;
  expected_keys integer;
  valid_context boolean;
  uuid_pattern constant text := '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$';
BEGIN
  FOR candidate IN
    SELECT * FROM hub.studio_publication_reservations
    WHERE phase = 'retired' AND thread_id IS NULL
      AND account_id IS NOT NULL AND context IS NOT NULL
      AND length(context) <= 2048
      AND scope_key ~ '^[a-f0-9]{64}$'
      AND semantic_hash ~ '^[a-f0-9]{64}$'
      AND snapshot_hash ~ '^[a-f0-9]{64}$'
      AND play_id ~ uuid_pattern
      AND (audience <> 'adult' OR author_id = account_id)
  LOOP
    BEGIN
      parsed_context := candidate.context::jsonb;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      CONTINUE;
    END;
    IF jsonb_typeof(parsed_context) IS DISTINCT FROM 'object' THEN CONTINUE; END IF;
    expected_keys := CASE parsed_context->>'kind' WHEN 'free' THEN 2 WHEN 'lesson' THEN 3 WHEN 'live' THEN 3 ELSE 0 END;
    IF expected_keys = 0 OR (SELECT count(*) FROM jsonb_object_keys(parsed_context)) <> expected_keys THEN CONTINUE; END IF;
    valid_context := CASE parsed_context->>'kind'
      WHEN 'free' THEN parsed_context->>'audience' = candidate.audience::text
      WHEN 'lesson' THEN jsonb_typeof(parsed_context->'lessonId') = 'string'
        AND jsonb_typeof(parsed_context->'blockId') = 'string'
        AND parsed_context->>'lessonId' ~ uuid_pattern AND parsed_context->>'blockId' ~ uuid_pattern
      WHEN 'live' THEN jsonb_typeof(parsed_context->'workspaceId') = 'string'
        AND parsed_context->>'workspaceId' ~ uuid_pattern
        AND jsonb_typeof(parsed_context->'revision') = 'number'
      ELSE false END;
    IF valid_context IS DISTINCT FROM true THEN CONTINUE; END IF;
    IF parsed_context->>'kind' = 'live' THEN
      IF NOT ((parsed_context->>'revision')::numeric BETWEEN 0 AND 9007199254740991)
        OR trunc((parsed_context->>'revision')::numeric) <> (parsed_context->>'revision')::numeric THEN CONTINUE; END IF;
    END IF;
    INSERT INTO hub.studio_reservation_cleanups
      (reservation_id, play_id, author_id, account_id, audience, snapshot_hash, context, created_at, next_attempt_at)
    VALUES
      (candidate.id, candidate.play_id, candidate.author_id, candidate.account_id, candidate.audience,
       candidate.snapshot_hash, parsed_context, candidate.updated_at, candidate.updated_at)
    ON CONFLICT (reservation_id) DO NOTHING;
  END LOOP;
END $$;
