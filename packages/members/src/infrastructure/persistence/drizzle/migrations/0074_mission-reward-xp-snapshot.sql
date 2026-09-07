ALTER TYPE "members"."xp_source_type" ADD VALUE 'mission_reward' BEFORE 'studio_submitted';--> statement-breakpoint
ALTER TABLE "members"."xp_events" ADD COLUMN "transaction_id" "xid8" DEFAULT pg_current_xact_id() NOT NULL;--> statement-breakpoint
CREATE INDEX "xp_events_ranking_snapshot_idx" ON "members"."xp_events" USING btree ("audience","transaction_id","user_id");