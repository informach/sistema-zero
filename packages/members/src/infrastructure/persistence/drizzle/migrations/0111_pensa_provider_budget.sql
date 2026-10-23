CREATE TABLE "members"."pensa_provider_usage" (
	"account_id" uuid NOT NULL,
	"day" date NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pensa_provider_usage_account_id_day_pk" PRIMARY KEY("account_id","day")
);
