ALTER TABLE "payments"."payments" ADD COLUMN "prior_failure_reason" text;--> statement-breakpoint
ALTER TABLE "payments"."payments" ADD COLUMN "prior_failed_at" timestamp with time zone;