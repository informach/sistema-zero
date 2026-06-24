ALTER TYPE "members"."lesson_block_kind" ADD VALUE 'certificate';--> statement-breakpoint
CREATE TABLE "members"."certificates_issued" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"course_ref" text NOT NULL,
	"serial" text NOT NULL,
	"student_name" text NOT NULL,
	"course_title" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_issued_user_course_uq" ON "members"."certificates_issued" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_issued_serial_uq" ON "members"."certificates_issued" USING btree ("serial");