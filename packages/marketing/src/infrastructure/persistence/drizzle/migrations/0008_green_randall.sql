CREATE TABLE "marketing"."editorial_uploads" (
	"asset_id" uuid PRIMARY KEY NOT NULL,
	"upload_id" text,
	"state" text NOT NULL,
	"error" text,
	"verification_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_uploads" ADD CONSTRAINT "editorial_uploads_asset_id_editorial_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "marketing"."editorial_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_uploads_verify_idx" ON "marketing"."editorial_uploads" USING btree ("state","next_attempt_at");