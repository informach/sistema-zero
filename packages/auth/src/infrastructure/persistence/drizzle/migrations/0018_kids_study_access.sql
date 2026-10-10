CREATE TABLE "auth"."study_attempts" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"resets_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."study_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"account_user_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"label" text NOT NULL,
	"duration_days" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"consumed_device_id" uuid,
	"grant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."study_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"active_session_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."study_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_user_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"label" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."refresh_token_families" ADD COLUMN "kids_context" jsonb;--> statement-breakpoint
ALTER TABLE "auth"."study_codes" ADD CONSTRAINT "study_codes_account_user_id_users_id_fk" FOREIGN KEY ("account_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."study_codes" ADD CONSTRAINT "study_codes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "auth"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."study_devices" ADD CONSTRAINT "study_devices_account_user_id_users_id_fk" FOREIGN KEY ("account_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."study_grants" ADD CONSTRAINT "study_grants_account_user_id_users_id_fk" FOREIGN KEY ("account_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."study_grants" ADD CONSTRAINT "study_grants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "auth"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."study_grants" ADD CONSTRAINT "study_grants_device_id_study_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "auth"."study_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_attempts_resets_idx" ON "auth"."study_attempts" USING btree ("resets_at");--> statement-breakpoint
CREATE UNIQUE INDEX "study_codes_hash_uq" ON "auth"."study_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "study_codes_expires_idx" ON "auth"."study_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "study_devices_token_uq" ON "auth"."study_devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "study_devices_account_idx" ON "auth"."study_devices" USING btree ("account_user_id");--> statement-breakpoint
CREATE INDEX "study_devices_expires_idx" ON "auth"."study_devices" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "study_grants_device_profile_uq" ON "auth"."study_grants" USING btree ("device_id","profile_id");--> statement-breakpoint
CREATE INDEX "study_grants_account_idx" ON "auth"."study_grants" USING btree ("account_user_id","profile_id");