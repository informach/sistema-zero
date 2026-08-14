CREATE TABLE "members"."studio_block_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"course_id" uuid NOT NULL,
	"blocks" jsonb NOT NULL,
	"granted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "studio_block_grants_user_course_uq" ON "members"."studio_block_grants" USING btree ("user_id","audience","course_id");--> statement-breakpoint
CREATE INDEX "studio_block_grants_user_idx" ON "members"."studio_block_grants" USING btree ("user_id","audience");