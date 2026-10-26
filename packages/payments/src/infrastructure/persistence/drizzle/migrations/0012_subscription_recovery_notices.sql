CREATE TABLE "payments"."subscription_recovery_notices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"case_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"day" integer NOT NULL,
	"request" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"message_id" uuid,
	"message_status" text,
	"accepted_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"observed_at" timestamp with time zone,
	CONSTRAINT "subscription_recovery_notices_purpose_check" CHECK ("payments"."subscription_recovery_notices"."purpose" in ('INITIAL', 'REMINDER', 'RECOVERED', 'CANCELED')),
	CONSTRAINT "subscription_recovery_notices_day_check" CHECK (("payments"."subscription_recovery_notices"."purpose" = 'REMINDER' and "payments"."subscription_recovery_notices"."day" between 1 and 29) or ("payments"."subscription_recovery_notices"."purpose" <> 'REMINDER' and "payments"."subscription_recovery_notices"."day" = 0)),
	CONSTRAINT "subscription_recovery_notices_attempt_check" CHECK ("payments"."subscription_recovery_notices"."attempt_count" >= 0 and (("payments"."subscription_recovery_notices"."attempt_count" = 0 and "payments"."subscription_recovery_notices"."last_attempt_at" is null) or ("payments"."subscription_recovery_notices"."attempt_count" > 0 and "payments"."subscription_recovery_notices"."last_attempt_at" is not null and "payments"."subscription_recovery_notices"."last_attempt_at" >= "payments"."subscription_recovery_notices"."created_at"))),
	CONSTRAINT "subscription_recovery_notices_receipt_check" CHECK (("payments"."subscription_recovery_notices"."message_id" is null and "payments"."subscription_recovery_notices"."message_status" is null and "payments"."subscription_recovery_notices"."accepted_at" is null and "payments"."subscription_recovery_notices"."delivered_at" is null and "payments"."subscription_recovery_notices"."observed_at" is null) or ("payments"."subscription_recovery_notices"."message_id" is not null and "payments"."subscription_recovery_notices"."message_status" is not null and "payments"."subscription_recovery_notices"."accepted_at" is not null and "payments"."subscription_recovery_notices"."observed_at" is not null and "payments"."subscription_recovery_notices"."accepted_at" >= "payments"."subscription_recovery_notices"."created_at" and "payments"."subscription_recovery_notices"."observed_at" >= "payments"."subscription_recovery_notices"."accepted_at" and ("payments"."subscription_recovery_notices"."delivered_at" is null or "payments"."subscription_recovery_notices"."delivered_at" between "payments"."subscription_recovery_notices"."accepted_at" and "payments"."subscription_recovery_notices"."observed_at"))),
	CONSTRAINT "subscription_recovery_notices_status_check" CHECK ("payments"."subscription_recovery_notices"."message_status" is null or "payments"."subscription_recovery_notices"."message_status" in ('QUEUED', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SUPPRESSED')),
	CONSTRAINT "subscription_recovery_notices_delivery_check" CHECK ("payments"."subscription_recovery_notices"."message_status" is null or "payments"."subscription_recovery_notices"."message_status" not in ('DELIVERED', 'READ') or "payments"."subscription_recovery_notices"."delivered_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_notices" ADD CONSTRAINT "subscription_recovery_notices_case_id_subscription_recovery_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "payments"."subscription_recovery_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_recovery_notices_purpose_uq" ON "payments"."subscription_recovery_notices" USING btree ("case_id","purpose","day");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_recovery_notices_message_uq" ON "payments"."subscription_recovery_notices" USING btree ("message_id");