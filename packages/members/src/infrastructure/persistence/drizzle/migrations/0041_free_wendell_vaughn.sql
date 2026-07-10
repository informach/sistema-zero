CREATE TABLE "members"."ai_usage_daily" (
	"account_id" uuid NOT NULL,
	"day" date NOT NULL,
	"feature" varchar(40) NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"privileged" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_daily_pk" PRIMARY KEY("account_id","day","feature")
);
--> statement-breakpoint
CREATE INDEX "ai_usage_daily_day_idx" ON "members"."ai_usage_daily" USING btree ("day");