DROP INDEX "members"."course_publication_queue_idx";--> statement-breakpoint
ALTER TABLE "members"."course_publication_jobs" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "members"."course_publication_jobs" ADD COLUMN "available_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."course_publication_jobs" ADD COLUMN "deadline_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "course_publication_queue_idx" ON "members"."course_publication_jobs" USING btree ("status","available_at","lease_until","created_at");--> statement-breakpoint
ALTER TABLE "members"."course_publication_jobs" ADD CONSTRAINT "course_publication_promotion_source" CHECK ("members"."course_publication_jobs"."operation" <> 'promote-kids' or "members"."course_publication_jobs"."source_hash" is not null);