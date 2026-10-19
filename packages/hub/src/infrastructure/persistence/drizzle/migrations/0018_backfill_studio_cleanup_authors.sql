-- Canonical post authors only; orphaned/ambiguous jobs remain unverified and pending.
-- This binds the job to its originating post, not ownership of the R2 artifact itself.
UPDATE hub.studio_artifact_cleanups u
SET author_id = t.author_id
FROM hub.threads t
JOIN hub.channels c ON c.id = t.channel_id
JOIN hub.spaces s ON s.id = c.space_id
WHERE u.author_id IS NULL AND u.delivered_at IS NULL
  AND u.thread_id = t.id AND u.play_id = t.play_id
  AND u.audience = s.audience AND t.is_showcase = true
  AND t.status IN ('deleted', 'rejected');
