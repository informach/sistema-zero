-- Preserve every legacy block and its order; completions, submissions and quiz history stay intact.
INSERT INTO members.lesson_structures (lesson_id, revision, sections)
SELECT l.id, gen_random_uuid(), jsonb_build_array(jsonb_build_object(
  'id', l.id, 'title', l.title, 'objective', '', 'intent', 'application',
  'blockIds', coalesce((SELECT jsonb_agg(b.id ORDER BY b.sort_order, b.id)
    FROM members.lesson_blocks b WHERE b.lesson_id = l.id), '[]'::jsonb),
  'workspaceBlockId', null, 'externalTool', null, 'pendingMedia', '[]'::jsonb
))
FROM members.lessons l
ON CONFLICT (lesson_id) DO NOTHING;
-- The old lesson-level video position remains available as the first video's fallback.
-- Ownership cannot be inferred for every old profile, so it is not copied to an invented account.
