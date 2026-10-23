-- Custom SQL migration file, put your code below! --
-- Pensa is replaced during a maintenance window. Creation documents and shared
-- accounting remain intact. Materialize cleanup before project cascades.
INSERT INTO members.pensa_deletion_jobs
  (id, account_id, profile_id, prefixes, not_before, created_at, updated_at)
SELECT p.id, p.account_id, p.user_id,
  COALESCE((SELECT jsonb_agg(DISTINCT prefix) FROM (
    SELECT 'creations/' || person.profile_id::text || '/pensa/' || p.id::text || '/' AS prefix
    FROM (
      SELECT p.user_id AS profile_id
      UNION SELECT m.profile_id FROM members.pensa_project_members m WHERE m.project_id = p.id
      UNION SELECT c.profile_id FROM members.pensa_checkpoints c WHERE c.project_id = p.id
      UNION SELECT n.profile_id FROM members.private_narrations n WHERE n.project_id = p.id
    ) person
    UNION
    SELECT f.value->>'destination' FROM members.pensa_operations o
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.output->'files', '[]'::jsonb)) f(value)
    WHERE o.project_id = p.id AND o.kind = 'restore' AND o.status <> 'succeeded'
      AND f.value->>'destination' IS NOT NULL
  ) paths), '[]'::jsonb), now() + interval '10 minutes', now(), now()
FROM members.pensa_projects p
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
UPDATE members.ai_usage_reservations SET status = 'released', updated_at = now()
WHERE project_id IS NOT NULL AND status = 'reserved';
--> statement-breakpoint
UPDATE members.ai_usage_reservations SET project_id = NULL WHERE project_id IS NOT NULL;
--> statement-breakpoint
UPDATE members.private_narrations SET project_id = NULL WHERE project_id IS NOT NULL;
--> statement-breakpoint
DELETE FROM members.pensa_projects;
