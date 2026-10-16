CREATE TABLE "auth"."browser_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"credential_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."browser_sessions" ADD CONSTRAINT "browser_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."browser_sessions" ADD CONSTRAINT "browser_sessions_family_id_refresh_token_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "auth"."refresh_token_families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "browser_sessions_credential_uq" ON "auth"."browser_sessions" USING btree ("credential_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "browser_sessions_family_uq" ON "auth"."browser_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "browser_sessions_user_idx" ON "auth"."browser_sessions" USING btree ("user_id");