CREATE TABLE "members"."help_collections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"title" varchar(60) NOT NULL,
	"description" varchar(240) DEFAULT '' NOT NULL,
	"icon" varchar(32) NOT NULL,
	"tone" varchar(32) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "help_collections_status_check" CHECK ("members"."help_collections"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "members"."help_tutorials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"collection_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"published_search_text" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "help_tutorials_status_check" CHECK ("members"."help_tutorials"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "help_tutorials_published_pair" CHECK (("members"."help_tutorials"."status" = 'published') = ("members"."help_tutorials"."published" is not null))
);
--> statement-breakpoint
ALTER TABLE "members"."help_tutorials" ADD CONSTRAINT "help_tutorials_collection_id_help_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "members"."help_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "help_collections_slug_uq" ON "members"."help_collections" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "help_tutorials_slug_uq" ON "members"."help_tutorials" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "help_tutorials_status_collection_idx" ON "members"."help_tutorials" USING btree ("status","collection_id","position");--> statement-breakpoint
-- Busca do Zappy sobre o texto achatado do tutorial publicado (mesma forma do índice da base
-- didática em 0054_studio_zappy). Escrito à mão: o drizzle-kit não declara índice de expressão.
CREATE INDEX "help_tutorials_fts_idx" ON "members"."help_tutorials" USING gin (to_tsvector('portuguese', coalesce("published_search_text", '')));
