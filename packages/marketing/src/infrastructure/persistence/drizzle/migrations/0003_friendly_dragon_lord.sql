CREATE TABLE "marketing"."provider_quota_usage" (
	"provider" text NOT NULL,
	"day" text NOT NULL,
	"units" bigint DEFAULT 0 NOT NULL,
	"uploads" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "provider_quota_usage_provider_day_pk" PRIMARY KEY("provider","day")
);
