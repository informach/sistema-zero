-- Run against Members after migration 0076. Read-only, aggregate results only.
BEGIN READ ONLY;

-- All 49 required positions, including absent and duplicate published courses.
WITH tiers(level, track, positions) AS (
  VALUES ('primeiros-passos', '2d', 1), ('iniciante', '2d', 8), ('iniciante', '3d', 8),
    ('intermediario', '2d', 8), ('intermediario', '3d', 8), ('avancado', '2d', 8), ('avancado', '3d', 8)
), expected AS (
  SELECT level, track, generate_series(1, positions) AS career_slot FROM tiers
)
SELECT e.level, e.track, e.career_slot,
  count(c.id) AS published_courses,
  count(c.id) FILTER (WHERE EXISTS (
    SELECT 1 FROM members.lessons l JOIN members.lesson_blocks b ON b.lesson_id=l.id
    WHERE l.course_id=c.id AND l.is_published AND b.kind='studio'
      AND b.content->'showcase'->>'enabled'='true'
      AND NOT EXISTS (SELECT 1 FROM members.lesson_blocks pending
        WHERE pending.lesson_id=l.id AND pending.kind='coming_soon')
  )) AS courses_with_publication_activity
FROM expected e LEFT JOIN members.courses c ON c.audience='kids' AND c.status='published'
  AND c.level::text=e.level AND c.track::text=e.track AND c.career_slot=e.career_slot
GROUP BY e.level, e.track, e.career_slot ORDER BY e.level, e.track, e.career_slot;

-- These are course milestones, not a measure of skill mastery or time on screen.
WITH milestones AS (
  SELECT user_id, source_id,
    bool_or(source_type='course_complete') AS completed,
    bool_or(source_type='course_showcased') AS showcased
  FROM members.xp_events WHERE audience='kids'
    AND source_type IN ('course_complete', 'course_showcased')
  GROUP BY user_id, source_id
)
SELECT count(*) FILTER (WHERE completed AND NOT showcased) AS completed_without_publication,
  count(*) FILTER (WHERE showcased AND NOT completed) AS published_before_completion,
  count(*) FILTER (WHERE completed AND showcased) AS completed_and_published
FROM milestones;

-- Pilot activity, by day; no individual learner identifiers in the output.
SELECT created_at::date AS day, count(*) AS sessions_started,
  count(*) FILTER (WHERE completed_at IS NOT NULL) AS sessions_completed,
  count(DISTINCT user_id) AS learners
FROM members.practice_sessions WHERE created_at >= now()-interval '28 days'
GROUP BY created_at::date ORDER BY day;

COMMIT;
