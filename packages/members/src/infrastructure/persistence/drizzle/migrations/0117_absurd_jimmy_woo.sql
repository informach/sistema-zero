CREATE TABLE "members"."studio_ai_attempts" (
	"run_id" uuid NOT NULL,
	"attempt" smallint NOT NULL,
	"status" varchar(16) NOT NULL,
	"actual_micro_usd" bigint,
	"generation_id" varchar(128),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "studio_ai_attempts_run_id_attempt_pk" PRIMARY KEY("run_id","attempt"),
	CONSTRAINT "studio_ai_attempt_state" CHECK ("members"."studio_ai_attempts"."status" in ('dispatched', 'uncertain', 'confirmed', 'rejected')),
	CONSTRAINT "studio_ai_attempt_cost" CHECK (("members"."studio_ai_attempts"."status" = 'confirmed' and "members"."studio_ai_attempts"."actual_micro_usd" >= 0) or ("members"."studio_ai_attempts"."status" <> 'confirmed' and "members"."studio_ai_attempts"."actual_micro_usd" is null))
);
--> statement-breakpoint
CREATE TABLE "members"."studio_ai_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" varchar(128) NOT NULL,
	"purpose" varchar(16) NOT NULL,
	"model" varchar(160) NOT NULL,
	"source" varchar(16) NOT NULL,
	"key_hash" varchar(64),
	"day" date NOT NULL,
	"input_bytes" integer NOT NULL,
	"max_output_tokens" integer NOT NULL,
	"max_attempts" smallint NOT NULL,
	"estimate_micro_usd" bigint NOT NULL,
	"spent_micro_usd" bigint DEFAULT 0 NOT NULL,
	"price_caps" jsonb NOT NULL,
	"dispatched" smallint DEFAULT 0 NOT NULL,
	"allowance_charged" boolean DEFAULT false NOT NULL,
	"privileged" boolean NOT NULL,
	"finished_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "studio_ai_runs_bounds" CHECK ("members"."studio_ai_runs"."max_attempts" between 1 and 6 and "members"."studio_ai_runs"."dispatched" between 0 and "members"."studio_ai_runs"."max_attempts" and "members"."studio_ai_runs"."estimate_micro_usd" > 0 and "members"."studio_ai_runs"."spent_micro_usd" >= 0),
	CONSTRAINT "studio_ai_runs_source" CHECK ("members"."studio_ai_runs"."source" in ('platform', 'openrouter'))
);
--> statement-breakpoint
ALTER TABLE "members"."studio_ai_attempts" ADD CONSTRAINT "studio_ai_attempts_run_id_studio_ai_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "members"."studio_ai_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."studio_ai_runs" ADD CONSTRAINT "studio_ai_runs_account_id_studio_ai_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "members"."studio_ai_accounts"("account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "studio_ai_attempt_generation_idx" ON "members"."studio_ai_attempts" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "studio_ai_runs_account_day_idx" ON "members"."studio_ai_runs" USING btree ("account_id","day");--> statement-breakpoint
CREATE INDEX "studio_ai_runs_active_idx" ON "members"."studio_ai_runs" USING btree ("account_id","expires_at") WHERE "members"."studio_ai_runs"."finished_at" is null;