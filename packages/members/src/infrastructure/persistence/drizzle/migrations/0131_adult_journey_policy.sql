CREATE TABLE "members"."adult_journey_grants" (
	"user_id" uuid NOT NULL,
	"capability" text NOT NULL,
	"policy_version" integer NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "adult_journey_grants_user_id_capability_pk" PRIMARY KEY("user_id","capability"),
	CONSTRAINT "adult_journey_capability_check" CHECK ("members"."adult_journey_grants"."capability" in ('studio', 'pinta', 'molda', 'bridge', 'pro', 'ai', 'pensa'))
);
--> statement-breakpoint
CREATE TABLE "members"."adult_journey_policy" (
	"id" text PRIMARY KEY DEFAULT 'adult' NOT NULL,
	"version" integer NOT NULL,
	"policy" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "adult_journey_policy_id_check" CHECK ("members"."adult_journey_policy"."id" = 'adult'),
	CONSTRAINT "adult_journey_policy_version_check" CHECK ("members"."adult_journey_policy"."version" >= 1)
);
