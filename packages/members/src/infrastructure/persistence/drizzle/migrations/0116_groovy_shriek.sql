CREATE TABLE "members"."studio_ai_accounts" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"source" varchar(16) DEFAULT 'platform' NOT NULL,
	"credential" text,
	"key_hash" varchar(64),
	"connected_at" timestamp with time zone,
	"external_daily_limit_micro_usd" integer,
	"external_monthly_limit_micro_usd" integer,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "studio_ai_source_check" CHECK ("members"."studio_ai_accounts"."source" in ('platform', 'openrouter')),
	CONSTRAINT "studio_ai_daily_limit_check" CHECK ("members"."studio_ai_accounts"."external_daily_limit_micro_usd" is null or "members"."studio_ai_accounts"."external_daily_limit_micro_usd" between 1 and 1000000000),
	CONSTRAINT "studio_ai_monthly_limit_check" CHECK ("members"."studio_ai_accounts"."external_monthly_limit_micro_usd" is null or "members"."studio_ai_accounts"."external_monthly_limit_micro_usd" between 1 and 1000000000)
);
--> statement-breakpoint
CREATE TABLE "members"."studio_ai_oauth_states" (
	"state_hash" varchar(64) PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"binding_hash" varchar(64) NOT NULL,
	"verifier" text NOT NULL,
	"callback_url" text NOT NULL,
	"revision" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."studio_ai_oauth_states" ADD CONSTRAINT "studio_ai_oauth_states_account_id_studio_ai_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "members"."studio_ai_accounts"("account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "studio_ai_oauth_account_idx" ON "members"."studio_ai_oauth_states" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "studio_ai_oauth_expiry_idx" ON "members"."studio_ai_oauth_states" USING btree ("expires_at");