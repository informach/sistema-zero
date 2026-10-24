CREATE TABLE "payments"."subscription_cancellation_audit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subscription_id" uuid NOT NULL,
	"consumer_id" text NOT NULL,
	"origin" text NOT NULL,
	"actor_id" text,
	"recovery_case_id" uuid,
	"requested_at" timestamp with time zone,
	"recorded_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"ended_status" text,
	"withdrawn_at" timestamp with time zone,
	"withdrawal_reason" text,
	"supersedes_id" uuid,
	"superseded_by" uuid,
	"superseded_at" timestamp with time zone,
	CONSTRAINT "subscription_cancellation_audit_origin_check" CHECK ("payments"."subscription_cancellation_audit"."origin" in ('CUSTOMER','ADMIN','CONSUMER','NONPAYMENT','EXTERNAL','SCHEDULE_COMPLETED')),
	CONSTRAINT "subscription_cancellation_audit_actor_check" CHECK (("payments"."subscription_cancellation_audit"."origin" = 'EXTERNAL' and "payments"."subscription_cancellation_audit"."actor_id" is null) or ("payments"."subscription_cancellation_audit"."origin" <> 'EXTERNAL' and "payments"."subscription_cancellation_audit"."actor_id" is not null and length("payments"."subscription_cancellation_audit"."actor_id") between 1 and 128)),
	CONSTRAINT "subscription_cancellation_audit_case_check" CHECK (("payments"."subscription_cancellation_audit"."origin" = 'NONPAYMENT' and "payments"."subscription_cancellation_audit"."recovery_case_id" is not null and "payments"."subscription_cancellation_audit"."actor_id" = 'system:subscription-recovery') or ("payments"."subscription_cancellation_audit"."origin" <> 'NONPAYMENT' and "payments"."subscription_cancellation_audit"."recovery_case_id" is null)),
	CONSTRAINT "subscription_cancellation_audit_request_check" CHECK (("payments"."subscription_cancellation_audit"."origin" in ('EXTERNAL','SCHEDULE_COMPLETED') and "payments"."subscription_cancellation_audit"."requested_at" is null) or ("payments"."subscription_cancellation_audit"."origin" not in ('EXTERNAL','SCHEDULE_COMPLETED') and "payments"."subscription_cancellation_audit"."requested_at" is not null and "payments"."subscription_cancellation_audit"."requested_at" <= "payments"."subscription_cancellation_audit"."recorded_at")),
	CONSTRAINT "subscription_cancellation_audit_confirmation_check" CHECK (("payments"."subscription_cancellation_audit"."confirmed_at" is null and "payments"."subscription_cancellation_audit"."ended_status" is null) or ("payments"."subscription_cancellation_audit"."confirmed_at" is not null and "payments"."subscription_cancellation_audit"."ended_status" is not null and "payments"."subscription_cancellation_audit"."ended_status" in ('CANCELED','EXPIRED') and "payments"."subscription_cancellation_audit"."confirmed_at" >= "payments"."subscription_cancellation_audit"."recorded_at")),
	CONSTRAINT "subscription_cancellation_audit_observed_check" CHECK ("payments"."subscription_cancellation_audit"."origin" not in ('EXTERNAL','SCHEDULE_COMPLETED') or "payments"."subscription_cancellation_audit"."confirmed_at" is not null),
	CONSTRAINT "subscription_cancellation_audit_schedule_check" CHECK ("payments"."subscription_cancellation_audit"."origin" <> 'SCHEDULE_COMPLETED' or ("payments"."subscription_cancellation_audit"."actor_id" = 'system:subscription-schedule' and "payments"."subscription_cancellation_audit"."ended_status" = 'EXPIRED')),
	CONSTRAINT "subscription_cancellation_audit_withdrawal_check" CHECK (("payments"."subscription_cancellation_audit"."withdrawn_at" is null and "payments"."subscription_cancellation_audit"."withdrawal_reason" is null) or ("payments"."subscription_cancellation_audit"."withdrawn_at" is not null and "payments"."subscription_cancellation_audit"."withdrawal_reason" is not null and "payments"."subscription_cancellation_audit"."origin" = 'NONPAYMENT' and "payments"."subscription_cancellation_audit"."confirmed_at" is null and "payments"."subscription_cancellation_audit"."withdrawal_reason" in ('RECOVERED','OPERATOR_REVIEW') and "payments"."subscription_cancellation_audit"."withdrawn_at" >= "payments"."subscription_cancellation_audit"."recorded_at")),
	CONSTRAINT "subscription_cancellation_audit_superseded_check" CHECK ((("payments"."subscription_cancellation_audit"."superseded_by" is null and "payments"."subscription_cancellation_audit"."superseded_at" is null) or ("payments"."subscription_cancellation_audit"."superseded_by" is not null and "payments"."subscription_cancellation_audit"."superseded_at" is not null and "payments"."subscription_cancellation_audit"."superseded_by" <> "payments"."subscription_cancellation_audit"."id" and "payments"."subscription_cancellation_audit"."superseded_at" >= "payments"."subscription_cancellation_audit"."recorded_at")) and ("payments"."subscription_cancellation_audit"."supersedes_id" is null or "payments"."subscription_cancellation_audit"."supersedes_id" <> "payments"."subscription_cancellation_audit"."id"))
);
--> statement-breakpoint
ALTER TABLE "payments"."subscriptions" ADD COLUMN "cancellation_record" jsonb;--> statement-breakpoint
ALTER TABLE "payments"."subscription_cancellation_audit" ADD CONSTRAINT "subscription_cancellation_audit_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "payments"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."subscription_cancellation_audit" ADD CONSTRAINT "subscription_cancellation_audit_recovery_case_id_subscription_recovery_cases_id_fk" FOREIGN KEY ("recovery_case_id") REFERENCES "payments"."subscription_recovery_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_cancellation_audit_history_idx" ON "payments"."subscription_cancellation_audit" USING btree ("subscription_id","recorded_at");--> statement-breakpoint
CREATE INDEX "subscription_cancellation_audit_case_idx" ON "payments"."subscription_cancellation_audit" USING btree ("recovery_case_id");