CREATE TABLE "members"."studio_sealed_heads" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"generation" uuid NOT NULL,
	CONSTRAINT "studio_sealed_heads_user_id_audience_item_id_pk" PRIMARY KEY("user_id","audience","item_id"),
	CONSTRAINT "studio_sealed_heads_audience_check" CHECK ("members"."studio_sealed_heads"."audience" in ('adult', 'kids'))
);
--> statement-breakpoint
CREATE TABLE "members"."studio_sealed_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"object_key" text NOT NULL,
	"part_nonce" uuid,
	"part_hash" varchar(64),
	"not_before" timestamp with time zone NOT NULL,
	"locked_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "studio_sealed_objects_audience_check" CHECK ("members"."studio_sealed_objects"."audience" in ('adult', 'kids'))
);
--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "pending_studio_seal" jsonb;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "studio_seal_proof_sha256" varchar(64);--> statement-breakpoint
CREATE INDEX "studio_sealed_heads_account_idx" ON "members"."studio_sealed_heads" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_sealed_objects_key_uq" ON "members"."studio_sealed_objects" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "studio_sealed_objects_due_idx" ON "members"."studio_sealed_objects" USING btree ("not_before");--> statement-breakpoint
CREATE INDEX "studio_sealed_objects_account_idx" ON "members"."studio_sealed_objects" USING btree ("account_id");