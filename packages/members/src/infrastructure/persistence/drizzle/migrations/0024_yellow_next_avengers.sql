WITH ranked AS (
	SELECT "id", row_number() OVER (PARTITION BY "lesson_id" ORDER BY "sort_order", "id") - 1 AS "new_sort_order"
	FROM "members"."lesson_attachments"
)
UPDATE "members"."lesson_attachments"
SET "sort_order" = ranked."new_sort_order"
FROM ranked
WHERE "members"."lesson_attachments"."id" = ranked."id";--> statement-breakpoint
WITH ranked AS (
	SELECT "id", row_number() OVER (PARTITION BY "lesson_id" ORDER BY "sort_order", "id") - 1 AS "new_sort_order"
	FROM "members"."lesson_blocks"
)
UPDATE "members"."lesson_blocks"
SET "sort_order" = ranked."new_sort_order"
FROM ranked
WHERE "members"."lesson_blocks"."id" = ranked."id";--> statement-breakpoint
WITH ranked AS (
	SELECT "id", row_number() OVER (PARTITION BY "module_id" ORDER BY "sort_order", "id") - 1 AS "new_sort_order"
	FROM "members"."lessons"
)
UPDATE "members"."lessons"
SET "sort_order" = ranked."new_sort_order"
FROM ranked
WHERE "members"."lessons"."id" = ranked."id";--> statement-breakpoint
WITH ranked AS (
	SELECT "id", row_number() OVER (PARTITION BY "course_id" ORDER BY "sort_order", "id") - 1 AS "new_sort_order"
	FROM "members"."modules"
)
UPDATE "members"."modules"
SET "sort_order" = ranked."new_sort_order"
FROM ranked
WHERE "members"."modules"."id" = ranked."id";--> statement-breakpoint
DROP INDEX "members"."lesson_attachments_lesson_idx";--> statement-breakpoint
DROP INDEX "members"."lesson_blocks_lesson_idx";--> statement-breakpoint
DROP INDEX "members"."lessons_module_idx";--> statement-breakpoint
DROP INDEX "members"."modules_course_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_attachments_lesson_sort_order_uq" ON "members"."lesson_attachments" USING btree ("lesson_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_blocks_lesson_sort_order_uq" ON "members"."lesson_blocks" USING btree ("lesson_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_module_sort_order_uq" ON "members"."lessons" USING btree ("module_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_course_sort_order_uq" ON "members"."modules" USING btree ("course_id","sort_order");
