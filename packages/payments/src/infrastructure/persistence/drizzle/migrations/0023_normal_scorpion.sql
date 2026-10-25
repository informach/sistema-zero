CREATE TABLE "payments"."subscription_recovery_resolutions" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"request_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"payment_version" integer NOT NULL,
	"subscription_version" integer NOT NULL,
	"original_payment_version" integer NOT NULL,
	"provider_payment_id" text NOT NULL,
	"original_charge_created_at" timestamp with time zone NOT NULL,
	"charge_created_at" timestamp with time zone NOT NULL,
	"period_starts_at" timestamp with time zone NOT NULL,
	"period_ends_at" timestamp with time zone NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "recovery_resolution_version_check" CHECK ("payments"."subscription_recovery_resolutions"."payment_version" >= 0 and "payments"."subscription_recovery_resolutions"."subscription_version" >= 0 and "payments"."subscription_recovery_resolutions"."original_payment_version" >= 0),
	CONSTRAINT "recovery_resolution_actor_check" CHECK (length(trim("payments"."subscription_recovery_resolutions"."actor_id")) between 1 and 200),
	CONSTRAINT "recovery_resolution_dates_check" CHECK ("payments"."subscription_recovery_resolutions"."original_charge_created_at" < "payments"."subscription_recovery_resolutions"."charge_created_at" and "payments"."subscription_recovery_resolutions"."charge_created_at" <= "payments"."subscription_recovery_resolutions"."observed_at" and "payments"."subscription_recovery_resolutions"."period_starts_at" <= "payments"."subscription_recovery_resolutions"."observed_at" and "payments"."subscription_recovery_resolutions"."period_starts_at" < "payments"."subscription_recovery_resolutions"."period_ends_at" and "payments"."subscription_recovery_resolutions"."observed_at" <= "payments"."subscription_recovery_resolutions"."resolved_at" and "payments"."subscription_recovery_resolutions"."resolved_at" <= "payments"."subscription_recovery_resolutions"."observed_at" + interval '60 seconds')
);
--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_cases" DROP CONSTRAINT "subscription_recovery_reason_check";--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_resolutions" ADD CONSTRAINT "subscription_recovery_resolutions_case_id_subscription_recovery_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "payments"."subscription_recovery_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_resolutions" ADD CONSTRAINT "subscription_recovery_resolutions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_resolution_request_uq" ON "payments"."subscription_recovery_resolutions" USING btree ("request_id");--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_cases" ADD CONSTRAINT "subscription_recovery_reason_check" CHECK ("payments"."subscription_recovery_cases"."reason" is null or "payments"."subscription_recovery_cases"."reason" in ('PAID', 'SUBSEQUENT_CYCLE_PAID', 'EXTERNAL_CANCELLATION', 'UNPAID_AFTER_NOTICE', 'PAYMENT_UNCERTAIN', 'CONTACT_FAILED', 'PROVIDER_DIVERGENCE'));