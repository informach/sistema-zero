CREATE SCHEMA "marketing";
--> statement-breakpoint
CREATE TYPE "marketing"."account_status" AS ENUM('connected', 'needs_reauth', 'revoked', 'disabled');--> statement-breakpoint
CREATE TYPE "marketing"."asset_kind" AS ENUM('raw', 'final', 'cover', 'other');--> statement-breakpoint
CREATE TYPE "marketing"."asset_status" AS ENUM('pending_upload', 'importing', 'ready', 'archiving', 'archived', 'failed');--> statement-breakpoint
CREATE TYPE "marketing"."checklist_origin" AS ENUM('template', 'manual');--> statement-breakpoint
CREATE TYPE "marketing"."content_stage" AS ENUM('idea', 'script', 'recording', 'editing', 'cover_caption', 'review', 'approved', 'scheduled', 'published', 'canceled');--> statement-breakpoint
CREATE TYPE "marketing"."content_type" AS ENUM('reels', 'video_long', 'carousel', 'static_post', 'story');--> statement-breakpoint
CREATE TYPE "marketing"."idea_status" AS ENUM('inbox', 'accepted', 'discarded');--> statement-breakpoint
CREATE TYPE "marketing"."network" AS ENUM('instagram', 'facebook', 'youtube', 'tiktok');--> statement-breakpoint
CREATE TYPE "marketing"."pub_format" AS ENUM('ig_feed', 'ig_carousel', 'ig_reels', 'ig_story', 'fb_post', 'fb_reels', 'yt_video', 'yt_short', 'tt_video');--> statement-breakpoint
CREATE TYPE "marketing"."pub_status" AS ENUM('draft', 'ready', 'scheduled', 'publishing', 'awaiting_manual', 'published', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "marketing"."publish_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE "marketing"."checklist_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content_id" uuid NOT NULL,
	"label" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"done_by" uuid,
	"done_by_name" text,
	"done_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"origin" "marketing"."checklist_origin" DEFAULT 'template' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"author_name" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."content_stage_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content_id" uuid NOT NULL,
	"from_stage" "marketing"."content_stage" NOT NULL,
	"to_stage" "marketing"."content_stage" NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_name" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."contents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"content_type" "marketing"."content_type" NOT NULL,
	"stage" "marketing"."content_stage" DEFAULT 'idea' NOT NULL,
	"brief" text,
	"script" text,
	"owner_user_id" uuid,
	"owner_name" text,
	"due_date" timestamp with time zone,
	"idea_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."ideas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"source" text,
	"status" "marketing"."idea_status" DEFAULT 'inbox' NOT NULL,
	"potential" integer,
	"complexity" text,
	"created_by" uuid NOT NULL,
	"created_by_name" text,
	"promoted_content_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."media_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content_id" uuid,
	"kind" "marketing"."asset_kind" DEFAULT 'other' NOT NULL,
	"r2_key" text,
	"drive_file_id" text,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"status" "marketing"."asset_status" DEFAULT 'pending_upload' NOT NULL,
	"transfer_attempts" integer DEFAULT 0 NOT NULL,
	"transfer_next_at" timestamp with time zone,
	"transfer_error" text,
	"archived_at" timestamp with time zone,
	"r2_deleted_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."metric_account_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"social_account_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"followers" integer DEFAULT 0 NOT NULL,
	"following" integer,
	"media_count" integer,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."metric_publication_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"publication_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"saves" integer DEFAULT 0 NOT NULL,
	"reach" bigint,
	"watch_time_seconds" bigint,
	"avg_watch_ratio" real,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."oauth_states" (
	"state" text PRIMARY KEY NOT NULL,
	"network" "marketing"."network" NOT NULL,
	"code_verifier" text,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."publication_assets" (
	"publication_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."publications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"content_id" uuid NOT NULL,
	"social_account_id" uuid,
	"network" "marketing"."network" NOT NULL,
	"format" "marketing"."pub_format" NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"title" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"cover_asset_id" uuid,
	"scheduled_at" timestamp with time zone,
	"publish_mode" "marketing"."publish_mode" DEFAULT 'manual' NOT NULL,
	"status" "marketing"."pub_status" DEFAULT 'draft' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"provider_session" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"external_post_id" text,
	"external_url" text,
	"published_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"metrics_last_collected_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."social_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"network" "marketing"."network" NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text NOT NULL,
	"username" text,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"refresh_expires_at" timestamp with time zone,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"status" "marketing"."account_status" DEFAULT 'connected' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected_by" uuid NOT NULL,
	"last_refresh_at" timestamp with time zone,
	"last_refresh_error" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."checklist_items" ADD CONSTRAINT "checklist_items_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "marketing"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."comments" ADD CONSTRAINT "comments_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "marketing"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."content_stage_events" ADD CONSTRAINT "content_stage_events_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "marketing"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."media_assets" ADD CONSTRAINT "media_assets_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "marketing"."contents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."metric_account_snapshots" ADD CONSTRAINT "metric_account_snapshots_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "marketing"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."metric_publication_snapshots" ADD CONSTRAINT "metric_publication_snapshots_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "marketing"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."publication_assets" ADD CONSTRAINT "publication_assets_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "marketing"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."publication_assets" ADD CONSTRAINT "publication_assets_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "marketing"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."publications" ADD CONSTRAINT "publications_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "marketing"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."publications" ADD CONSTRAINT "publications_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "marketing"."social_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checklist_items_content_idx" ON "marketing"."checklist_items" USING btree ("content_id","position");--> statement-breakpoint
CREATE INDEX "comments_content_created_idx" ON "marketing"."comments" USING btree ("content_id","created_at");--> statement-breakpoint
CREATE INDEX "content_stage_events_content_idx" ON "marketing"."content_stage_events" USING btree ("content_id","created_at");--> statement-breakpoint
CREATE INDEX "contents_stage_idx" ON "marketing"."contents" USING btree ("stage","updated_at");--> statement-breakpoint
CREATE INDEX "contents_owner_idx" ON "marketing"."contents" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "contents_due_idx" ON "marketing"."contents" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "ideas_status_created_idx" ON "marketing"."ideas" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_content_idx" ON "marketing"."media_assets" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "media_assets_transfer_idx" ON "marketing"."media_assets" USING btree ("status","transfer_next_at") WHERE "marketing"."media_assets"."status" in ('importing', 'archiving');--> statement-breakpoint
CREATE INDEX "metric_account_snapshots_idx" ON "marketing"."metric_account_snapshots" USING btree ("social_account_id","captured_at");--> statement-breakpoint
CREATE INDEX "metric_pub_snapshots_idx" ON "marketing"."metric_publication_snapshots" USING btree ("publication_id","captured_at");--> statement-breakpoint
CREATE INDEX "oauth_states_expires_idx" ON "marketing"."oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "publication_assets_uq" ON "marketing"."publication_assets" USING btree ("publication_id","media_asset_id");--> statement-breakpoint
CREATE INDEX "publication_assets_pub_idx" ON "marketing"."publication_assets" USING btree ("publication_id","position");--> statement-breakpoint
CREATE INDEX "publications_content_idx" ON "marketing"."publications" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "publications_claim_idx" ON "marketing"."publications" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "publications_lease_idx" ON "marketing"."publications" USING btree ("status","next_attempt_at") WHERE "marketing"."publications"."status" = 'publishing';--> statement-breakpoint
CREATE UNIQUE INDEX "social_accounts_network_external_uq" ON "marketing"."social_accounts" USING btree ("network","external_id");