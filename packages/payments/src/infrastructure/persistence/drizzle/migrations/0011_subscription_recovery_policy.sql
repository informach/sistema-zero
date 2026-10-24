CREATE TABLE "payments"."subscription_recovery_policy" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"window_days" integer NOT NULL,
	"reminder_days" jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"activated_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "subscription_recovery_policy_singleton" CHECK ("payments"."subscription_recovery_policy"."id" = 1),
	CONSTRAINT "subscription_recovery_policy_version" CHECK ("payments"."subscription_recovery_policy"."version" > 0),
	CONSTRAINT "subscription_recovery_policy_window" CHECK ("payments"."subscription_recovery_policy"."window_days" between 1 and 30),
	CONSTRAINT "subscription_recovery_policy_reminders" CHECK (jsonb_typeof("payments"."subscription_recovery_policy"."reminder_days") = 'array'),
	CONSTRAINT "subscription_recovery_policy_activation" CHECK (not "payments"."subscription_recovery_policy"."enabled" or "payments"."subscription_recovery_policy"."activated_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "payments"."subscription_recovery_policy_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"actor_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_recovery_policy_audit_version_uq" ON "payments"."subscription_recovery_policy_audit" USING btree ("version");