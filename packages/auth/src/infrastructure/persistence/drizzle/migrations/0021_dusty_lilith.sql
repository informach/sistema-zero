CREATE TABLE "auth"."desktop_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"credential_hash" text,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth"."desktop_pairings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"device_code_hash" text NOT NULL,
	"user_code_hash" text NOT NULL,
	"challenge" text NOT NULL,
	"label" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_by" uuid,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth"."refresh_token_families" ADD COLUMN "desktop_context" jsonb;--> statement-breakpoint
ALTER TABLE "auth"."desktop_devices" ADD CONSTRAINT "desktop_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."desktop_pairings" ADD CONSTRAINT "desktop_pairings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "desktop_devices_user_idx" ON "auth"."desktop_devices" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "desktop_devices_session_idx" ON "auth"."desktop_devices" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "desktop_devices_credential_idx" ON "auth"."desktop_devices" USING btree ("credential_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "desktop_pairings_device_code_idx" ON "auth"."desktop_pairings" USING btree ("device_code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "desktop_pairings_user_code_idx" ON "auth"."desktop_pairings" USING btree ("user_code_hash");--> statement-breakpoint
CREATE INDEX "desktop_pairings_expiry_idx" ON "auth"."desktop_pairings" USING btree ("expires_at");