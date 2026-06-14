CREATE SCHEMA "hub";
--> statement-breakpoint
CREATE TYPE "hub"."attachment_kind" AS ENUM('image', 'pdf', 'document', 'audio', 'video');--> statement-breakpoint
CREATE TYPE "hub"."attachment_status" AS ENUM('pending_upload', 'ready');--> statement-breakpoint
CREATE TYPE "hub"."audience" AS ENUM('adult', 'kids');--> statement-breakpoint
CREATE TYPE "hub"."content_status" AS ENUM('pending', 'visible', 'hidden', 'deleted', 'rejected');--> statement-breakpoint
CREATE TYPE "hub"."moderation_kind" AS ENUM('approve', 'reject', 'hide', 'delete', 'pin', 'unpin', 'lock', 'unlock', 'mute', 'ban', 'unmute', 'unban');--> statement-breakpoint
CREATE TYPE "hub"."mute_ban_kind" AS ENUM('mute', 'ban');--> statement-breakpoint
CREATE TYPE "hub"."posting_policy" AS ENUM('members', 'staff_only');--> statement-breakpoint
CREATE TYPE "hub"."reaction_target" AS ENUM('thread', 'comment');--> statement-breakpoint
CREATE TYPE "hub"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "hub"."report_target" AS ENUM('thread', 'comment');--> statement-breakpoint
CREATE TYPE "hub"."space_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "hub"."visibility" AS ENUM('public', 'course_gated', 'role_gated');--> statement-breakpoint
CREATE TABLE "hub"."attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"thread_id" uuid,
	"comment_id" uuid,
	"kind" "hub"."attachment_kind" NOT NULL,
	"storage_ref" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"original_name" text NOT NULL,
	"status" "hub"."attachment_status" DEFAULT 'pending_upload' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."channels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"space_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"topic" text,
	"access_config" jsonb,
	"posting_policy" "hub"."posting_policy" DEFAULT 'members' NOT NULL,
	"requires_approval" boolean,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "hub"."space_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "hub"."content_status" DEFAULT 'visible' NOT NULL,
	"reply_to_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hub"."moderation_actions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" "hub"."moderation_kind" NOT NULL,
	"space_id" uuid,
	"channel_id" uuid,
	"target_user_id" uuid,
	"target_id" uuid,
	"moderator_id" uuid NOT NULL,
	"reason" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."mutes_bans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"channel_id" uuid,
	"kind" "hub"."mute_ban_kind" NOT NULL,
	"expires_at" timestamp with time zone,
	"reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."processed_webhooks" (
	"delivery_id" text PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."reactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"target_type" "hub"."reaction_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."read_state" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"target_type" "hub"."report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "hub"."report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."spaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"audience" "hub"."audience" DEFAULT 'adult' NOT NULL,
	"access_config" jsonb NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "hub"."space_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub"."threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"status" "hub"."content_status" DEFAULT 'visible' NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "hub"."attachments" ADD CONSTRAINT "attachments_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "hub"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub"."attachments" ADD CONSTRAINT "attachments_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "hub"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub"."channels" ADD CONSTRAINT "channels_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "hub"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub"."comments" ADD CONSTRAINT "comments_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "hub"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub"."read_state" ADD CONSTRAINT "read_state_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "hub"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hub"."threads" ADD CONSTRAINT "threads_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "hub"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_thread_idx" ON "hub"."attachments" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "attachments_comment_idx" ON "hub"."attachments" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "attachments_owner_status_idx" ON "hub"."attachments" USING btree ("owner_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_space_slug_uq" ON "hub"."channels" USING btree ("space_id","slug");--> statement-breakpoint
CREATE INDEX "channels_space_sort_idx" ON "hub"."channels" USING btree ("space_id","sort_order");--> statement-breakpoint
CREATE INDEX "comments_thread_status_created_idx" ON "hub"."comments" USING btree ("thread_id","status","created_at","id");--> statement-breakpoint
CREATE INDEX "moderation_actions_space_created_idx" ON "hub"."moderation_actions" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX "mutes_bans_user_space_idx" ON "hub"."mutes_bans" USING btree ("user_id","space_id");--> statement-breakpoint
CREATE INDEX "processed_webhooks_processed_at_idx" ON "hub"."processed_webhooks" USING btree ("processed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_target_user_emoji_uq" ON "hub"."reactions" USING btree ("target_type","target_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "reactions_target_idx" ON "hub"."reactions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "read_state_user_channel_uq" ON "hub"."read_state" USING btree ("user_id","channel_id");--> statement-breakpoint
CREATE INDEX "reports_space_status_created_idx" ON "hub"."reports" USING btree ("space_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_slug_uq" ON "hub"."spaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "spaces_audience_sort_idx" ON "hub"."spaces" USING btree ("audience","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "threads_channel_slug_uq" ON "hub"."threads" USING btree ("channel_id","slug");--> statement-breakpoint
CREATE INDEX "threads_channel_status_activity_idx" ON "hub"."threads" USING btree ("channel_id","status","last_activity_at");--> statement-breakpoint
CREATE INDEX "threads_author_status_idx" ON "hub"."threads" USING btree ("author_id","status");