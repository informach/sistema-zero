-- Reference/idempotency only. No owner receipt, account, source hash or artifact claim is inferred.
INSERT INTO hub.studio_publication_reservations
  (id, idempotency_key, play_id, author_id, audience, phase, thread_id, created_at, updated_at)
SELECT t.id, t.showcase_idempotency_key, t.play_id, t.author_id, s.audience,
  CASE WHEN t.status IN ('deleted', 'rejected') THEN 'retired' ELSE 'finalized' END,
  t.id, t.created_at, t.created_at
FROM hub.threads t
JOIN hub.channels c ON c.id = t.channel_id
JOIN hub.spaces s ON s.id = c.space_id
WHERE t.is_showcase = true AND t.play_id IS NOT NULL AND t.showcase_idempotency_key IS NOT NULL
ON CONFLICT (idempotency_key) DO NOTHING;
