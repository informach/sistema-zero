CREATE TABLE "members"."pinta_causal_units" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"op_id" uuid NOT NULL,
	"intent_hash" varchar(64) NOT NULL,
	"state" text NOT NULL,
	"pages" jsonb,
	"intent" jsonb,
	"result" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pinta_causal_units_user_id_audience_op_id_pk" PRIMARY KEY("user_id","audience","op_id")
);
--> statement-breakpoint
ALTER TABLE "members"."creation_inventory_floors" ADD COLUMN "graph_epoch" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."creation_inventory_floors" ADD COLUMN "requires_causal_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "causal_manifest" jsonb;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "causal_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "layout_revision" bigint;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "pending_unit" uuid;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "pending_binding" jsonb;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "pending_attestation" jsonb;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "backfill_ticket" jsonb;--> statement-breakpoint
CREATE INDEX "pinta_causal_units_expiry_idx" ON "members"."pinta_causal_units" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pinta_causal_units_account_idx" ON "members"."pinta_causal_units" USING btree ("account_id");