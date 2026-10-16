CREATE TABLE "marketing"."editorial_handoffs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"selection" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "editorial_handoffs_expiry_idx" ON "marketing"."editorial_handoffs" USING btree ("expires_at");