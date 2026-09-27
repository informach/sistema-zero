-- Preserve requirements previously inferred from block settings before making
-- the section's explicit selection authoritative. Completed milestones stay intact.
CREATE OR REPLACE FUNCTION pg_temp.sz_explicit_criteria(sections jsonb, blocks jsonb)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT COALESCE(jsonb_agg(
    CASE WHEN section ? 'completion' THEN
      jsonb_set(section, '{completion,blockIds}', (
        SELECT COALESCE(jsonb_agg(to_jsonb(id) ORDER BY first_position), '[]'::jsonb)
        FROM (
          SELECT id, min(position) AS first_position FROM (
            SELECT value AS id, ordinality AS position
            FROM jsonb_array_elements_text(COALESCE(section #> '{completion,blockIds}', '[]'::jsonb)) WITH ORDINALITY
            UNION ALL
            SELECT block->>'id', 1000 + ordinality
            FROM jsonb_array_elements(blocks) WITH ORDINALITY AS b(block, ordinality)
            WHERE section->'blockIds' ? (block->>'id') AND (
              (block #>> '{content,kind}' = 'interactive' AND block #>> '{content,required}' = 'true')
              OR (block #>> '{content,kind}' = 'quiz' AND jsonb_typeof(block #> '{content,passingScore}') = 'number' AND (block #>> '{content,passingScore}')::numeric > 0 AND jsonb_array_length(COALESCE(block #> '{content,questions}', '[]'::jsonb)) > 0)
              OR (block #>> '{content,kind}' IN ('studio', 'pinta') AND COALESCE(block #>> '{content,purpose}', 'submission') <> 'experiment')
            )
          ) candidates GROUP BY id
        ) distinct_candidates
      ))
    ELSE section END ORDER BY position
  ), '[]'::jsonb)
  FROM jsonb_array_elements(sections) WITH ORDINALITY AS s(section, position);
$$;
--> statement-breakpoint
INSERT INTO members.lesson_criteria_migration_snapshots (lesson_id, previous_sections, migrated_sections)
SELECT s.lesson_id, s.sections, pg_temp.sz_explicit_criteria(s.sections, (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', b.id, 'content', b.content)), '[]'::jsonb)
  FROM members.lesson_blocks b WHERE b.lesson_id = s.lesson_id AND b.archived_at IS NULL
)) FROM members.lesson_structures s
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(s.sections) section WHERE section ? 'completion')
ON CONFLICT (lesson_id) DO NOTHING;
--> statement-breakpoint
UPDATE members.lesson_structures AS s SET sections = m.migrated_sections, revision = gen_random_uuid()
FROM members.lesson_criteria_migration_snapshots m WHERE m.lesson_id = s.lesson_id AND s.sections = m.previous_sections;
--> statement-breakpoint
UPDATE members.lesson_drafts AS d
SET document = jsonb_set(d.document, '{sections}', pg_temp.sz_explicit_criteria(d.document->'sections', d.document->'blocks')),
    revision = gen_random_uuid(), updated_at = now()
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(d.document->'sections') section WHERE section ? 'completion');
--> statement-breakpoint
DROP FUNCTION pg_temp.sz_explicit_criteria(jsonb, jsonb);
--> statement-breakpoint
UPDATE members.teacher_threads t SET workflow_status = CASE WHEN (
  SELECT m.author_role FROM members.teacher_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
) = 'student' THEN 'waiting_teacher' ELSE 'waiting_student' END;
--> statement-breakpoint
INSERT INTO members.lesson_evidence (id, user_id, lesson_id, block_id, kind, revision, payload, created_at)
SELECT q.id, q.user_id, q.lesson_id, q.block_id, 'quiz', b.content_revision,
 jsonb_build_object('attempt', to_jsonb(q), 'definition', b.content, 'verifiedBy', 'server'), q.created_at
FROM members.quiz_attempts q JOIN members.lesson_blocks b ON b.id = q.block_id ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO members.lesson_evidence (id, user_id, account_id, lesson_id, block_id, kind, revision, payload, created_at)
SELECT gen_random_uuid(), s.user_id, s.account_id, b.lesson_id, b.id, 'studio', b.content_revision,
 jsonb_build_object('project', s.project, 'score', s.score, 'results', s.results, 'definition', b.content), s.submitted_at
FROM members.studio_submissions s JOIN members.lesson_blocks b ON b.id = s.block_id;
