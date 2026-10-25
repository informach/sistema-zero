CREATE TABLE "payments"."subscription_recovery_admissions" (
	"payment_id" uuid PRIMARY KEY NOT NULL,
	"policy" jsonb NOT NULL,
	"activated_at" timestamp with time zone NOT NULL,
	"discovered_at" timestamp with time zone NOT NULL,
	"state" text NOT NULL,
	"reason" text,
	"case_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	CONSTRAINT "subscription_recovery_admissions_state_check" CHECK ("payments"."subscription_recovery_admissions"."state" in ('PENDING','ADMITTED','REVIEW','IGNORED')),
	CONSTRAINT "subscription_recovery_admissions_result_check" CHECK (("payments"."subscription_recovery_admissions"."state" = 'PENDING' and "payments"."subscription_recovery_admissions"."reason" is null and "payments"."subscription_recovery_admissions"."case_id" is null and "payments"."subscription_recovery_admissions"."next_attempt_at" is not null) or ("payments"."subscription_recovery_admissions"."state" = 'ADMITTED' and "payments"."subscription_recovery_admissions"."reason" is null and "payments"."subscription_recovery_admissions"."case_id" is not null and "payments"."subscription_recovery_admissions"."next_attempt_at" is null) or ("payments"."subscription_recovery_admissions"."state" in ('REVIEW','IGNORED') and "payments"."subscription_recovery_admissions"."reason" is not null and "payments"."subscription_recovery_admissions"."case_id" is null and "payments"."subscription_recovery_admissions"."next_attempt_at" is null)),
	CONSTRAINT "subscription_recovery_admissions_reason_check" CHECK ("payments"."subscription_recovery_admissions"."reason" is null or "payments"."subscription_recovery_admissions"."reason" in ('AUDIENCE_UNKNOWN','LEGACY_RENEWAL','SOURCE_DATE_UNKNOWN','NO_LONGER_ELIGIBLE','CASE_EXISTS','PROVIDER_DIVERGENCE','PROVIDER_UNAVAILABLE')),
	CONSTRAINT "subscription_recovery_admissions_lease_check" CHECK (("payments"."subscription_recovery_admissions"."lease_id" is null) = ("payments"."subscription_recovery_admissions"."lease_until" is null)),
	CONSTRAINT "subscription_recovery_admissions_attempts_check" CHECK ("payments"."subscription_recovery_admissions"."attempts" >= 0 and "payments"."subscription_recovery_admissions"."attempts" <= 5),
	CONSTRAINT "subscription_recovery_admissions_dates_check" CHECK ("payments"."subscription_recovery_admissions"."activated_at" <= "payments"."subscription_recovery_admissions"."discovered_at")
);
--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_admissions" ADD CONSTRAINT "subscription_recovery_admissions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_admissions" ADD CONSTRAINT "subscription_recovery_admissions_case_id_subscription_recovery_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "payments"."subscription_recovery_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_recovery_admissions_due_idx" ON "payments"."subscription_recovery_admissions" USING btree ("next_attempt_at") WHERE "payments"."subscription_recovery_admissions"."state" = 'PENDING';