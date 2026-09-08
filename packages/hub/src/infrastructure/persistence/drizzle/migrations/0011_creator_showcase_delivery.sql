CREATE TABLE "hub"."showcase_deliveries" (
	"thread_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"audience" "hub"."audience" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "hub"."showcase_deliveries" ADD CONSTRAINT "showcase_deliveries_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "hub"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "showcase_deliveries_pending_idx" ON "hub"."showcase_deliveries" USING btree ("next_attempt_at") WHERE "hub"."showcase_deliveries"."delivered_at" is null;