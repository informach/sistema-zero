CREATE TABLE "funil"."member_product_claims" (
	"account_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"checkout_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_product_claims_account_id_product_id_pk" PRIMARY KEY("account_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "funil"."member_checkouts" ADD COLUMN "origin_keys" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "funil"."member_checkouts" ADD COLUMN "dispatch_plan" jsonb;--> statement-breakpoint
ALTER TABLE "funil"."member_checkouts" ADD COLUMN "attempt_phase" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "funil"."member_product_claims" ADD CONSTRAINT "member_product_claims_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "funil"."leads"("id") ON DELETE no action ON UPDATE no action;