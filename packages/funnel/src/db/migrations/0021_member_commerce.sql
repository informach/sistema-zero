CREATE TABLE "funil"."member_checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"offer_ref" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"origin" jsonb NOT NULL,
	"card_attempt_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funil"."member_customers" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"contact" jsonb NOT NULL,
	"birth" text,
	"address" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funil"."leads" ADD COLUMN "member_context" jsonb;--> statement-breakpoint
ALTER TABLE "funil"."member_checkouts" ADD CONSTRAINT "member_checkouts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "funil"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_checkout_account_offer_uq" ON "funil"."member_checkouts" USING btree ("account_id","offer_id");