CREATE TABLE "members"."lesson_draft_operations" (
	"lesson_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"revision" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_draft_operations_lesson_id_operation_id_pk" PRIMARY KEY("lesson_id","operation_id")
);
--> statement-breakpoint
CREATE TABLE "members"."lesson_drafts" (
	"lesson_id" uuid PRIMARY KEY NOT NULL,
	"revision" uuid NOT NULL,
	"published_revision" text NOT NULL,
	"document" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "members"."lesson_blocks_lesson_sort_order_uq";--> statement-breakpoint
ALTER TABLE "members"."lesson_blocks" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members"."lesson_structures" ADD COLUMN "support_block_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."lesson_draft_operations" ADD CONSTRAINT "lesson_draft_operations_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."lesson_drafts" ADD CONSTRAINT "lesson_drafts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_blocks_lesson_sort_order_uq" ON "members"."lesson_blocks" USING btree ("lesson_id","sort_order") WHERE "members"."lesson_blocks"."archived_at" is null;--> statement-breakpoint
CREATE VIEW "members"."active_lesson_blocks" AS (select "id", "lesson_id", "kind", "sort_order", "content", "archived_at", "content_revision" from "members"."lesson_blocks" where "members"."lesson_blocks"."archived_at" is null);