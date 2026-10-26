CREATE TABLE "members"."creator_journey_course_grants" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"course_id" uuid NOT NULL,
	"policy_version" integer NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "creator_journey_course_grants_user_id_audience_course_id_pk" PRIMARY KEY("user_id","audience","course_id"),
	CONSTRAINT "creator_journey_course_grants_audience_check" CHECK ("members"."creator_journey_course_grants"."audience" in ('kids', 'adult')),
	CONSTRAINT "creator_journey_course_grants_version_check" CHECK ("members"."creator_journey_course_grants"."policy_version" >= 1),
	CONSTRAINT "creator_journey_course_grants_adult_owner_check" CHECK ("members"."creator_journey_course_grants"."audience" <> 'adult' or "members"."creator_journey_course_grants"."user_id" = "members"."creator_journey_course_grants"."account_id")
);
--> statement-breakpoint
CREATE TABLE "members"."mastery_awards" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"mastery_id" text NOT NULL,
	"level" integer NOT NULL,
	"submission_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"awarded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mastery_awards_user_id_audience_mastery_id_level_pk" PRIMARY KEY("user_id","audience","mastery_id","level"),
	CONSTRAINT "mastery_award_level_check" CHECK ("members"."mastery_awards"."level" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "members"."mastery_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"submission_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"criteria" jsonb NOT NULL,
	"credits" jsonb NOT NULL,
	"feedback" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."mastery_submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"mastery_id" text NOT NULL,
	"level" integer NOT NULL,
	"area_title" text NOT NULL,
	"policy_version" integer NOT NULL,
	"rubric_version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"evidence_id" uuid NOT NULL,
	"evidence_title" text NOT NULL,
	"evidence_lesson_id" uuid NOT NULL,
	"evidence_kind" text NOT NULL,
	"evidence_revision" text NOT NULL,
	"evidence_payload" jsonb NOT NULL,
	"evidence_created_at" timestamp with time zone NOT NULL,
	"message" text,
	"submitted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mastery_submission_level_check" CHECK ("members"."mastery_submissions"."level" between 1 and 3),
	CONSTRAINT "mastery_submission_audience_check" CHECK ("members"."mastery_submissions"."audience" in ('kids', 'adult'))
);
--> statement-breakpoint
ALTER TABLE "members"."mastery_awards" ADD CONSTRAINT "mastery_awards_submission_id_mastery_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "members"."mastery_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."mastery_awards" ADD CONSTRAINT "mastery_awards_review_id_mastery_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "members"."mastery_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."mastery_reviews" ADD CONSTRAINT "mastery_reviews_submission_id_mastery_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "members"."mastery_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_journey_course_grants_account_idx" ON "members"."creator_journey_course_grants" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mastery_review_submission_uq" ON "members"."mastery_reviews" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mastery_submission_evidence_uq" ON "members"."mastery_submissions" USING btree ("user_id","audience","mastery_id","level","evidence_id","rubric_version");--> statement-breakpoint
CREATE INDEX "mastery_submission_owner_idx" ON "members"."mastery_submissions" USING btree ("user_id","account_id","audience");--> statement-breakpoint
CREATE INDEX "mastery_submission_queue_idx" ON "members"."mastery_submissions" USING btree ("audience","submitted_at");