CREATE TABLE "marketing"."editorial_monitor_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"watchlist_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"evidence_revision_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"observed_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"change" text NOT NULL,
	"source_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_monitors" (
	"watchlist_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"source_hash" text NOT NULL,
	"config" jsonb NOT NULL,
	"state" text NOT NULL,
	"next_at" timestamp with time zone NOT NULL,
	"lease_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"budget_day" text,
	"calls_today" integer DEFAULT 0 NOT NULL,
	"last_collected_at" timestamp with time zone,
	"error" text,
	"etag" text,
	"observed_entries" integer DEFAULT 0 NOT NULL,
	"truncated" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_monitor_entries" ADD CONSTRAINT "editorial_monitor_entries_watchlist_id_editorial_monitors_watchlist_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "marketing"."editorial_monitors"("watchlist_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_monitor_entries" ADD CONSTRAINT "editorial_monitor_entries_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_monitor_entries" ADD CONSTRAINT "editorial_monitor_entries_evidence_id_editorial_items_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "marketing"."editorial_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_monitor_entries" ADD CONSTRAINT "editorial_monitor_entries_evidence_revision_id_editorial_revisions_id_fk" FOREIGN KEY ("evidence_revision_id") REFERENCES "marketing"."editorial_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_monitors" ADD CONSTRAINT "editorial_monitors_watchlist_id_editorial_items_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "marketing"."editorial_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_monitors" ADD CONSTRAINT "editorial_monitors_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_monitor_entries_identity_idx" ON "marketing"."editorial_monitor_entries" USING btree ("watchlist_id","source_key","content_hash");--> statement-breakpoint
CREATE INDEX "editorial_monitor_entries_page_idx" ON "marketing"."editorial_monitor_entries" USING btree ("watchlist_id","observed_at","id");--> statement-breakpoint
CREATE INDEX "editorial_monitors_due_idx" ON "marketing"."editorial_monitors" USING btree ("state","next_at");--> statement-breakpoint
CREATE INDEX "editorial_monitors_project_idx" ON "marketing"."editorial_monitors" USING btree ("project_id");