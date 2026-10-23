CREATE TABLE "members"."adult_journey_reached" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"policy_version" integer NOT NULL,
	"reached_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "adult_journey_reached_position_check" CHECK ("members"."adult_journey_reached"."position" >= 1)
);
