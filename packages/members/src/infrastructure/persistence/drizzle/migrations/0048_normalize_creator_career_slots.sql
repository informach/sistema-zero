UPDATE "members"."courses"
SET "career_slot" = NULL
WHERE "career_slot" IS NOT NULL
  AND (
    "audience" <> 'kids'
    OR "career_slot" < 1
    OR "career_slot" > CASE
      WHEN "level" = 'iniciante' AND "track" = '2d' THEN 6
      ELSE 5
    END
  );
