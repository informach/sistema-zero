CREATE TABLE "auth"."audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_email" text,
	"actor_role" text,
	"action" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"target_id" text,
	"status" integer NOT NULL,
	"ip" text,
	"user_agent" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "auth"."audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "auth"."audit_logs" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_created_idx" ON "auth"."audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "auth"."audit_logs" USING btree ("created_at");