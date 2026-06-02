CREATE SCHEMA "members";
--> statement-breakpoint
CREATE TYPE "members"."access_type" AS ENUM('download', 'course', 'community', 'external', 'none');--> statement-breakpoint
CREATE TYPE "members"."course_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "members"."entitlement_source_kind" AS ENUM('payment', 'subscription', 'manual');--> statement-breakpoint
CREATE TYPE "members"."entitlement_status" AS ENUM('active', 'revoked', 'expired', 'pending');--> statement-breakpoint
CREATE TYPE "members"."lesson_block_kind" AS ENUM('rich_text', 'video', 'image', 'audio', 'quiz', 'embed');--> statement-breakpoint
CREATE TABLE "members"."courses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"cover_image_url" text,
	"status" "members"."course_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."entitlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_kind" text NOT NULL,
	"access_type" "members"."access_type" NOT NULL,
	"course_ref" text,
	"offer_id" uuid,
	"snapshot" jsonb NOT NULL,
	"status" "members"."entitlement_status" DEFAULT 'active' NOT NULL,
	"source_kind" "members"."entitlement_source_kind" NOT NULL,
	"source_id" text NOT NULL,
	"subscription_id" text,
	"granted_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."lesson_attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lesson_id" uuid NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"file_type" text,
	"size_bytes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."lesson_blocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lesson_id" uuid NOT NULL,
	"kind" "members"."lesson_block_kind" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."lesson_completions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"completed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."lessons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"module_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"estimated_minutes" integer,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."modules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."processed_webhooks" (
	"delivery_id" text PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."lesson_attachments" ADD CONSTRAINT "lesson_attachments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."lesson_blocks" ADD CONSTRAINT "lesson_blocks_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "members"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "members"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "members"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "courses_slug_uq" ON "members"."courses" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_idem_uq" ON "members"."entitlements" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_user_product_source_uq" ON "members"."entitlements" USING btree ("user_id","product_id","source_kind","source_id");--> statement-breakpoint
CREATE INDEX "entitlements_user_idx" ON "members"."entitlements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entitlements_user_courseref_idx" ON "members"."entitlements" USING btree ("user_id","course_ref");--> statement-breakpoint
CREATE INDEX "entitlements_subscription_idx" ON "members"."entitlements" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "lesson_attachments_lesson_idx" ON "members"."lesson_attachments" USING btree ("lesson_id","sort_order");--> statement-breakpoint
CREATE INDEX "lesson_blocks_lesson_idx" ON "members"."lesson_blocks" USING btree ("lesson_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_completions_user_lesson_uq" ON "members"."lesson_completions" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_completions_user_course_idx" ON "members"."lesson_completions" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_course_slug_uq" ON "members"."lessons" USING btree ("course_id","slug");--> statement-breakpoint
CREATE INDEX "lessons_module_idx" ON "members"."lessons" USING btree ("module_id","sort_order");--> statement-breakpoint
CREATE INDEX "modules_course_idx" ON "members"."modules" USING btree ("course_id","sort_order");