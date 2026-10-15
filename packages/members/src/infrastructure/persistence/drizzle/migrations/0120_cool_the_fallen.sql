CREATE TABLE "members"."studio_builder_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" varchar(128) NOT NULL,
	"objective" text NOT NULL,
	"base" jsonb NOT NULL,
	"phase" varchar(16) NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"model_calls" smallint DEFAULT 0 NOT NULL,
	"validation_calls" smallint DEFAULT 0 NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"result" jsonb,
	"error" text,
	"cost" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "studio_builder_phase" CHECK ("members"."studio_builder_jobs"."phase" in ('queued','generating','validating','review','failed','cancelled')),
	CONSTRAINT "studio_builder_bounds" CHECK ("members"."studio_builder_jobs"."model_calls" between 0 and 3 and "members"."studio_builder_jobs"."validation_calls" between 0 and 3 and "members"."studio_builder_jobs"."version" >= 0 and char_length("members"."studio_builder_jobs"."objective") between 1 and 2000 and octet_length("members"."studio_builder_jobs"."base"::text) <= 3000000 and ("members"."studio_builder_jobs"."result" is null or octet_length("members"."studio_builder_jobs"."result"::text) <= 3000000)),
	CONSTRAINT "studio_builder_lease" CHECK (("members"."studio_builder_jobs"."lease_token" is null) = ("members"."studio_builder_jobs"."lease_until" is null))
);
--> statement-breakpoint
CREATE INDEX "studio_builder_owner_idx" ON "members"."studio_builder_jobs" USING btree ("account_id","user_id","project_id","created_at");--> statement-breakpoint
CREATE INDEX "studio_builder_expiry_idx" ON "members"."studio_builder_jobs" USING btree ("expires_at");