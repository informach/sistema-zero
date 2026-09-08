-- Run against Hub after migrations 0011 and 0012. No payloads or learner IDs exported.
BEGIN READ ONLY;
SELECT count(*) FILTER (WHERE delivered_at IS NULL) AS pending,
  count(*) FILTER (WHERE delivered_at IS NULL AND next_attempt_at <= now()) AS due_for_retry,
  max(now()-t.created_at) FILTER (WHERE delivered_at IS NULL) AS oldest_pending_publication_age,
  max(attempts) FILTER (WHERE delivered_at IS NULL) AS highest_pending_attempts,
  count(*) FILTER (WHERE delivered_at IS NOT NULL) AS acknowledged
FROM hub.showcase_deliveries d JOIN hub.threads t ON t.id=d.thread_id;
COMMIT;
