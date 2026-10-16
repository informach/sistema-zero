CREATE TYPE "helpdesk"."knowledge_audience" AS ENUM('staff_only', 'customer_adult', 'customer_parent', 'customer_all');--> statement-breakpoint
CREATE TYPE "helpdesk"."knowledge_index_state" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "helpdesk"."knowledge_product" AS ENUM('all', 'community', 'kids', 'studio');--> statement-breakpoint
CREATE TABLE "helpdesk"."kb_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"revision_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"section" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."kb_publication_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"revision_id" uuid,
	"action" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."kb_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"audience" "helpdesk"."knowledge_audience" NOT NULL,
	"product" "helpdesk"."knowledge_product" NOT NULL,
	"owner_name" text NOT NULL,
	"origin" text NOT NULL,
	"valid_until" timestamp with time zone,
	"content_hash" text NOT NULL,
	"index_version" integer NOT NULL,
	"index_state" "helpdesk"."knowledge_index_state" DEFAULT 'pending' NOT NULL,
	"index_attempts" integer DEFAULT 0 NOT NULL,
	"index_next_at" timestamp with time zone NOT NULL,
	"index_lease_token" uuid,
	"index_lease_expires_at" timestamp with time zone,
	"index_error" text,
	"created_by" uuid NOT NULL,
	"created_by_name" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "helpdesk"."kb_articles_published_idx";--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD COLUMN "draft_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD COLUMN "published_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD COLUMN "audience" "helpdesk"."knowledge_audience" DEFAULT 'staff_only' NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD COLUMN "product" "helpdesk"."knowledge_product" DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD COLUMN "owner_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD COLUMN "origin" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD COLUMN "valid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_chunks" ADD CONSTRAINT "kb_chunks_revision_id_kb_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "helpdesk"."kb_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_publication_events" ADD CONSTRAINT "kb_publication_events_article_id_kb_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "helpdesk"."kb_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_publication_events" ADD CONSTRAINT "kb_publication_events_revision_id_kb_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "helpdesk"."kb_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_revisions" ADD CONSTRAINT "kb_revisions_article_id_kb_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "helpdesk"."kb_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kb_chunk_position_uq" ON "helpdesk"."kb_chunks" USING btree ("revision_id","position");--> statement-breakpoint
CREATE INDEX "kb_chunk_search_idx" ON "helpdesk"."kb_chunks" USING gin (to_tsvector('portuguese'::regconfig, "section" || ' ' || "text"));--> statement-breakpoint
CREATE UNIQUE INDEX "kb_revision_number_uq" ON "helpdesk"."kb_revisions" USING btree ("article_id","number");--> statement-breakpoint
CREATE INDEX "kb_revision_claim_idx" ON "helpdesk"."kb_revisions" USING btree ("index_state","index_next_at");--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD CONSTRAINT "kb_articles_draft_revision_id_kb_revisions_id_fk" FOREIGN KEY ("draft_revision_id") REFERENCES "helpdesk"."kb_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk"."kb_articles" ADD CONSTRAINT "kb_articles_published_revision_id_kb_revisions_id_fk" FOREIGN KEY ("published_revision_id") REFERENCES "helpdesk"."kb_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kb_articles_published_revision_idx" ON "helpdesk"."kb_articles" USING btree ("published_revision_id");