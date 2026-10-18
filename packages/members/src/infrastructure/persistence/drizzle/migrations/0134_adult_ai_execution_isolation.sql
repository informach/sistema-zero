CREATE TABLE "members"."adult_studio_builder_project_deletions" (
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "adult_studio_builder_project_deletions_account_id_user_id_project_id_pk" PRIMARY KEY("account_id","user_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "members"."studio_ai_runs" ADD COLUMN "audience" text DEFAULT 'kids' NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."studio_builder_jobs" ADD COLUMN "audience" text DEFAULT 'kids' NOT NULL;--> statement-breakpoint
CREATE INDEX "adult_studio_builder_project_deletion_expiry_idx" ON "members"."adult_studio_builder_project_deletions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "adult_help_tutorials_search_idx" ON "members"."adult_help_tutorials" USING gin (to_tsvector('portuguese', coalesce("published_search_text", '')));