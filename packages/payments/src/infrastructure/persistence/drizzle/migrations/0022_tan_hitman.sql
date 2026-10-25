CREATE TABLE "payments"."subscription_recovery_admission_reviews" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"request_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"policy_version" integer NOT NULL,
	"payment_version" integer NOT NULL,
	"source_observed_at" timestamp with time zone NOT NULL,
	"source_charge_created_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subscription_recovery_admission_reviews_actor_check" CHECK (length(btrim("payments"."subscription_recovery_admission_reviews"."actor_id")) between 1 and 200),
	CONSTRAINT "subscription_recovery_admission_reviews_audience_check" CHECK ("payments"."subscription_recovery_admission_reviews"."audience" in ('kids', 'adult')),
	CONSTRAINT "subscription_recovery_admission_reviews_version_check" CHECK ("payments"."subscription_recovery_admission_reviews"."policy_version" >= 0 and "payments"."subscription_recovery_admission_reviews"."payment_version" >= 0),
	CONSTRAINT "subscription_recovery_admission_reviews_source_check" CHECK ("payments"."subscription_recovery_admission_reviews"."source_charge_created_at" <= "payments"."subscription_recovery_admission_reviews"."source_observed_at" and "payments"."subscription_recovery_admission_reviews"."source_observed_at" <= "payments"."subscription_recovery_admission_reviews"."approved_at" and "payments"."subscription_recovery_admission_reviews"."approved_at" - "payments"."subscription_recovery_admission_reviews"."source_observed_at" <= interval '60 seconds')
);
--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_admission_reviews" ADD CONSTRAINT "subscription_recovery_admission_reviews_case_id_subscription_recovery_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "payments"."subscription_recovery_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments"."subscription_recovery_admission_reviews" ADD CONSTRAINT "subscription_recovery_admission_reviews_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_recovery_admission_reviews_request_uq" ON "payments"."subscription_recovery_admission_reviews" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_recovery_admission_reviews_payment_uq" ON "payments"."subscription_recovery_admission_reviews" USING btree ("payment_id");