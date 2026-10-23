CREATE TABLE "marketing"."editorial_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"epoch" integer NOT NULL,
	"device_id" uuid NOT NULL,
	"state" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"checkpoint" jsonb NOT NULL,
	"outcome" jsonb
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"request" jsonb NOT NULL,
	"context" jsonb NOT NULL,
	"state" text NOT NULL,
	"epoch" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_attempt_id" uuid,
	"outcome" jsonb
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_attempts" ADD CONSTRAINT "editorial_attempts_run_id_editorial_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "marketing"."editorial_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_runs" ADD CONSTRAINT "editorial_runs_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_attempts_epoch_idx" ON "marketing"."editorial_attempts" USING btree ("run_id","epoch");--> statement-breakpoint
CREATE INDEX "editorial_runs_project_idx" ON "marketing"."editorial_runs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "editorial_runs_owner_idx" ON "marketing"."editorial_runs" USING btree ("created_by","state");