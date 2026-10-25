CREATE TYPE "payments"."subscription_recovery_state" AS ENUM('OPEN', 'PAYMENT_PENDING', 'CANCEL_PENDING', 'RECOVERED', 'CANCELED', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE TABLE "payments"."subscription_recovery_cases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"subscription_id" uuid NOT NULL,
	"consumer_id" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"provider_payment_id" text NOT NULL,
	"audience" text NOT NULL,
	"amount_in_cents" bigint NOT NULL,
	"policy" jsonb NOT NULL,
	"state" "payments"."subscription_recovery_state" NOT NULL,
	"reason" text,
	"first_failure_at" timestamp with time zone NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"initial_notice_id" text,
	"initial_notice_accepted_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"last_reminder_day" integer DEFAULT 0 NOT NULL,
	"last_provider_check_at" timestamp with time zone,
	"next_action_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	CONSTRAINT "subscription_recovery_amount_check" CHECK ("payments"."subscription_recovery_cases"."amount_in_cents" > 0),
	CONSTRAINT "subscription_recovery_version_check" CHECK ("payments"."subscription_recovery_cases"."version" >= 0),
	CONSTRAINT "subscription_recovery_audience_check" CHECK ("payments"."subscription_recovery_cases"."audience" in ('kids', 'adult')),
	CONSTRAINT "subscription_recovery_failure_check" CHECK ("payments"."subscription_recovery_cases"."first_failure_at" <= "payments"."subscription_recovery_cases"."opened_at"),
	CONSTRAINT "subscription_recovery_policy_check" CHECK ("payments"."subscription_recovery_cases"."policy" ? 'version' and "payments"."subscription_recovery_cases"."policy" ? 'windowDays' and "payments"."subscription_recovery_cases"."policy" ? 'reminderDays' and jsonb_typeof("payments"."subscription_recovery_cases"."policy"->'version') = 'number' and jsonb_typeof("payments"."subscription_recovery_cases"."policy"->'windowDays') = 'number' and ("payments"."subscription_recovery_cases"."policy"->>'version')::integer > 0 and ("payments"."subscription_recovery_cases"."policy"->>'windowDays')::integer between 1 and 30 and jsonb_typeof("payments"."subscription_recovery_cases"."policy"->'reminderDays') = 'array'),
	CONSTRAINT "subscription_recovery_notice_check" CHECK ((
    ("payments"."subscription_recovery_cases"."initial_notice_id" is null and "payments"."subscription_recovery_cases"."initial_notice_accepted_at" is null and "payments"."subscription_recovery_cases"."deadline_at" is null)
    or ("payments"."subscription_recovery_cases"."initial_notice_id" is not null and "payments"."subscription_recovery_cases"."initial_notice_accepted_at" is not null and "payments"."subscription_recovery_cases"."deadline_at" is not null
      and "payments"."subscription_recovery_cases"."initial_notice_accepted_at" >= "payments"."subscription_recovery_cases"."opened_at"
      and "payments"."subscription_recovery_cases"."deadline_at" = "payments"."subscription_recovery_cases"."initial_notice_accepted_at" + (("payments"."subscription_recovery_cases"."policy"->>'windowDays')::integer * interval '86400 seconds'))
  )),
	CONSTRAINT "subscription_recovery_terminal_check" CHECK (("payments"."subscription_recovery_cases"."state" in ('RECOVERED', 'CANCELED')) = ("payments"."subscription_recovery_cases"."closed_at" is not null)),
	CONSTRAINT "subscription_recovery_due_check" CHECK (("payments"."subscription_recovery_cases"."state" in ('RECOVERED', 'CANCELED', 'MANUAL_REVIEW')) = ("payments"."subscription_recovery_cases"."next_action_at" is null)),
	CONSTRAINT "subscription_recovery_closed_check" CHECK ("payments"."subscription_recovery_cases"."closed_at" is null or "payments"."subscription_recovery_cases"."closed_at" >= "payments"."subscription_recovery_cases"."opened_at"),
	CONSTRAINT "subscription_recovery_reason_check" CHECK ("payments"."subscription_recovery_cases"."reason" is null or "payments"."subscription_recovery_cases"."reason" in ('PAID', 'EXTERNAL_CANCELLATION', 'UNPAID_AFTER_NOTICE', 'PAYMENT_UNCERTAIN', 'CONTACT_FAILED', 'PROVIDER_DIVERGENCE')),
	CONSTRAINT "subscription_recovery_cancel_notice_check" CHECK ("payments"."subscription_recovery_cases"."state" <> 'CANCEL_PENDING' or "payments"."subscription_recovery_cases"."initial_notice_id" is not null),
	CONSTRAINT "subscription_recovery_lease_check" CHECK (("payments"."subscription_recovery_cases"."lease_id" is null) = ("payments"."subscription_recovery_cases"."lease_until" is null))
);
--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_cases" ADD CONSTRAINT "subscription_recovery_cases_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "payments"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_cases" ADD CONSTRAINT "subscription_recovery_cases_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_recovery_origin_uq" ON "payments"."subscription_recovery_cases" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_recovery_active_uq" ON "payments"."subscription_recovery_cases" USING btree ("subscription_id") WHERE "payments"."subscription_recovery_cases"."state" in ('OPEN', 'PAYMENT_PENDING', 'CANCEL_PENDING', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE INDEX "subscription_recovery_due_idx" ON "payments"."subscription_recovery_cases" USING btree ("next_action_at") WHERE "payments"."subscription_recovery_cases"."next_action_at" is not null;--> statement-breakpoint
CREATE INDEX "subscription_recovery_audience_idx" ON "payments"."subscription_recovery_cases" USING btree ("audience","state","opened_at");