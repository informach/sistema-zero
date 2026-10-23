CREATE TABLE "members"."adult_help_collections" (
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
	CONSTRAINT "adult_help_collections_status_check" CHECK ("members"."adult_help_collections"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "members"."adult_help_tutorials" (
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
	CONSTRAINT "adult_help_tutorials_status_check" CHECK ("members"."adult_help_tutorials"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "adult_help_tutorials_published_pair" CHECK (("members"."adult_help_tutorials"."status" = 'published') = ("members"."adult_help_tutorials"."published" is not null))
);
--> statement-breakpoint
ALTER TABLE "members"."adult_help_tutorials" ADD CONSTRAINT "adult_help_tutorials_collection_id_adult_help_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "members"."adult_help_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adult_help_collections_slug_uq" ON "members"."adult_help_collections" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "adult_help_tutorials_slug_uq" ON "members"."adult_help_tutorials" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "adult_help_tutorials_status_collection_idx" ON "members"."adult_help_tutorials" USING btree ("status","collection_id","position");