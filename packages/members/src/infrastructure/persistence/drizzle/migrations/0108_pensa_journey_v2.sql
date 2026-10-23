CREATE TABLE "members"."ai_usage_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"project_id" uuid,
	"day" date NOT NULL,
	"feature" varchar(40) NOT NULL,
	"status" varchar(16) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"privileged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_checkpoints" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"creation_id" varchar(120) NOT NULL,
	"save_revision" varchar(120) NOT NULL,
	"journey" jsonb NOT NULL,
	"manifest" jsonb NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_journeys" (
	"cycle_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."pensa_operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" varchar(24) NOT NULL,
	"step" varchar(24) NOT NULL,
	"status" varchar(24) NOT NULL,
	"input_revision" integer NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."ai_usage_reservations" ADD CONSTRAINT "ai_usage_reservations_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_checkpoints" ADD CONSTRAINT "pensa_checkpoints_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_checkpoints" ADD CONSTRAINT "pensa_checkpoints_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_journeys" ADD CONSTRAINT "pensa_journeys_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_journeys" ADD CONSTRAINT "pensa_journeys_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_operations" ADD CONSTRAINT "pensa_operations_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."pensa_operations" ADD CONSTRAINT "pensa_operations_cycle_id_pensa_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "members"."pensa_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_reservations_account_idx" ON "members"."ai_usage_reservations" USING btree ("account_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "pensa_checkpoints_project_idx" ON "members"."pensa_checkpoints" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_journeys_active_uq" ON "members"."pensa_journeys" USING btree ("project_id") WHERE "members"."pensa_journeys"."active" = true;--> statement-breakpoint
CREATE INDEX "pensa_operations_project_idx" ON "members"."pensa_operations" USING btree ("project_id","status");