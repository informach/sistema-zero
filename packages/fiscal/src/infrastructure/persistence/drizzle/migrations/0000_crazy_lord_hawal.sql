CREATE SCHEMA "fiscal";
--> statement-breakpoint
CREATE TYPE "fiscal"."invoice_status" AS ENUM('SCHEDULED', 'EMITTED', 'SKIPPED', 'FAILED', 'CANCEL_PENDING', 'CANCELLED', 'SUBSTITUTED');--> statement-breakpoint
CREATE TABLE "fiscal"."dps_counters" (
	"series" text PRIMARY KEY NOT NULL,
	"last_number" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal"."invoice_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal"."invoice_pdfs" (
	"invoice_id" uuid PRIMARY KEY NOT NULL,
	"content" "bytea" NOT NULL,
	"content_type" text DEFAULT 'application/pdf' NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"payment_id" uuid NOT NULL,
	"status" "fiscal"."invoice_status" NOT NULL,
	"customer" jsonb NOT NULL,
	"amount_in_cents" bigint NOT NULL,
	"service_description" text NOT NULL,
	"offer_id" uuid,
	"guarantee_days" integer,
	"paid_at" timestamp with time zone NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"skip_reason" text,
	"dps_series" text,
	"dps_number" bigint,
	"dps_id" text,
	"dps_xml" text,
	"nfse_xml" text,
	"access_key" text,
	"competence_date" text,
	"ambiente" text NOT NULL,
	"emitted_at" timestamp with time zone,
	"cancel_reason" text,
	"cancel_requested_by" text,
	"cancel_event_xml" text,
	"cancelled_at" timestamp with time zone,
	"substitutes_id" uuid,
	"substituted_by_id" uuid,
	"pdf_stored_at" timestamp with time zone,
	"pdf_token" text,
	"email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal"."processed_webhooks" (
	"delivery_id" text PRIMARY KEY NOT NULL,
	"payment_id" text,
	"event_name" text,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "invoice_events_invoice_idx" ON "fiscal"."invoice_events" USING btree ("invoice_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_payment_active_uq" ON "fiscal"."invoices" USING btree ("payment_id") WHERE status NOT IN ('SUBSTITUTED', 'SKIPPED', 'CANCELLED', 'FAILED') AND substitutes_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_dps_uq" ON "fiscal"."invoices" USING btree ("dps_series","dps_number") WHERE dps_number IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_access_key_uq" ON "fiscal"."invoices" USING btree ("access_key") WHERE access_key IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_pdf_token_uq" ON "fiscal"."invoices" USING btree ("pdf_token") WHERE pdf_token IS NOT NULL;--> statement-breakpoint
CREATE INDEX "invoices_due_idx" ON "fiscal"."invoices" USING btree ("scheduled_for") WHERE status = 'SCHEDULED';--> statement-breakpoint
CREATE INDEX "invoices_cancel_due_idx" ON "fiscal"."invoices" USING btree ("updated_at") WHERE status = 'CANCEL_PENDING';--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "fiscal"."invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_created_at_idx" ON "fiscal"."invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invoices_payment_idx" ON "fiscal"."invoices" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "processed_webhooks_processed_at_idx" ON "fiscal"."processed_webhooks" USING btree ("processed_at");