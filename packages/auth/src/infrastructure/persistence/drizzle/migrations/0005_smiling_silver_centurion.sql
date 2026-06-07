CREATE TABLE "auth"."impersonation_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD COLUMN "impersonator_user_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "impersonation_tokens_hash_uq" ON "auth"."impersonation_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "impersonation_tokens_expires_idx" ON "auth"."impersonation_tokens" USING btree ("expires_at");