CREATE TABLE "funil"."lead_payments" (
	"payment_id" uuid PRIMARY KEY NOT NULL,
	"lead_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funil"."lead_payments" ADD CONSTRAINT "lead_payments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "funil"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_payment_idx" ON "funil"."leads" USING btree ("payment_id");