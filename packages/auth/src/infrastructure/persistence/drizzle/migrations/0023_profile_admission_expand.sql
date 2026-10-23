CREATE TABLE "auth"."profile_admissions" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"account_user_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"last_error_code" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "profile_admissions_status_ck" CHECK ("auth"."profile_admissions"."status" in ('pending','completed','cancelled')),
	CONSTRAINT "profile_admissions_attempts_ck" CHECK ("auth"."profile_admissions"."attempts" >= 0),
	CONSTRAINT "profile_admissions_request_hash_ck" CHECK ("auth"."profile_admissions"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "profile_admissions_lease_ck" CHECK (("auth"."profile_admissions"."lease_id" is null) = ("auth"."profile_admissions"."lease_until" is null)),
	CONSTRAINT "profile_admissions_completed_ck" CHECK (("auth"."profile_admissions"."status" = 'pending' and "auth"."profile_admissions"."completed_at" is null) or ("auth"."profile_admissions"."status" <> 'pending' and "auth"."profile_admissions"."completed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "auth"."profiles" ADD COLUMN "admission_state" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth"."profile_admissions" ADD CONSTRAINT "profile_admissions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "auth"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_admissions_account_request_uq" ON "auth"."profile_admissions" USING btree ("account_user_id","request_id");--> statement-breakpoint
CREATE INDEX "profile_admissions_pending_idx" ON "auth"."profile_admissions" USING btree ("next_attempt_at","profile_id") WHERE "auth"."profile_admissions"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "auth"."profiles" ADD CONSTRAINT "profiles_admission_state_ck" CHECK ("auth"."profiles"."admission_state" in ('pending','ready'));