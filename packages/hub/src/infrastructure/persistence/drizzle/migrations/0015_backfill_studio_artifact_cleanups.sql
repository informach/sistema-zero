-- Recover terminal publications whose earlier best-effort webhook was lost.
-- Audience is authoritative from the owning channel/space; no URL is fetched here.
INSERT INTO hub.studio_artifact_cleanups (thread_id, play_id, cover_url, audience)
SELECT t.id, t.play_id, t.cover_image_url, s.audience
FROM hub.threads t
JOIN hub.channels c ON c.id = t.channel_id
JOIN hub.spaces s ON s.id = c.space_id
WHERE t.status = 'deleted' AND t.is_showcase = true AND t.play_id IS NOT NULL
ON CONFLICT (thread_id) DO NOTHING;
