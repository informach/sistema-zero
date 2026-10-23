DROP INDEX "members"."creations_user_tool_item_uq";--> statement-breakpoint
DROP INDEX "members"."creations_user_tool_idx";--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "audience" text DEFAULT 'kids' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "creations_user_audience_tool_item_uq" ON "members"."creations" USING btree ("user_id","audience","tool","item_id");--> statement-breakpoint
CREATE INDEX "creations_user_tool_idx" ON "members"."creations" USING btree ("user_id","audience","tool","deleted_at");--> statement-breakpoint
ALTER TABLE "members"."creations" ADD CONSTRAINT "creations_audience_check" CHECK ("members"."creations"."audience" in ('adult', 'kids'));