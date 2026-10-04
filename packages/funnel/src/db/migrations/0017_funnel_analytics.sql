CREATE TABLE "funil"."analytics_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"page_view_id" uuid NOT NULL,
	"page" text NOT NULL,
	"funnel" text,
	"revision" text NOT NULL,
	"name" text NOT NULL,
	"element_id" text,
	"label" text,
	"section_id" text,
	"destination" text,
	"quiz_definition_id" text,
	"question_id" text,
	"position" integer,
	"progress" integer,
	"error_code" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funil"."analytics_lead_links" (
	"lead_id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"linked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funil"."analytics_quiz_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"funnel" text NOT NULL,
	"definition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funil"."analytics_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"visitor_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"entry_path" text NOT NULL,
	"attribution" jsonb,
	"device" text NOT NULL,
	"referrer_host" text,
	"started_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funil"."analytics_visitors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_attribution" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "quiz_definition_id" text;--> statement-breakpoint
ALTER TABLE "funil"."analytics_events" ADD CONSTRAINT "analytics_events_session_id_analytics_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "funil"."analytics_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funil"."analytics_lead_links" ADD CONSTRAINT "analytics_lead_links_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "funil"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funil"."analytics_lead_links" ADD CONSTRAINT "analytics_lead_links_session_id_analytics_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "funil"."analytics_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funil"."analytics_sessions" ADD CONSTRAINT "analytics_sessions_visitor_id_analytics_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "funil"."analytics_visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_session_idx" ON "funil"."analytics_events" USING btree ("session_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_page_idx" ON "funil"."analytics_events" USING btree ("page","revision","name");--> statement-breakpoint
CREATE INDEX "analytics_events_quiz_idx" ON "funil"."analytics_events" USING btree ("quiz_definition_id","question_id");--> statement-breakpoint
CREATE INDEX "analytics_events_received_idx" ON "funil"."analytics_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "analytics_quiz_funnel_idx" ON "funil"."analytics_quiz_definitions" USING btree ("funnel","created_at");--> statement-breakpoint
CREATE INDEX "analytics_session_visitor_idx" ON "funil"."analytics_sessions" USING btree ("visitor_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "analytics_session_period_idx" ON "funil"."analytics_sessions" USING btree ("environment","started_at");--> statement-breakpoint
CREATE INDEX "analytics_visitor_retention_idx" ON "funil"."analytics_visitors" USING btree ("last_seen_at");