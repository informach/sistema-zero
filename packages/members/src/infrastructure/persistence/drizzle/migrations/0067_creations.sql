CREATE TYPE "members"."creation_tool" AS ENUM('studio', 'pinta');--> statement-breakpoint
CREATE TABLE "members"."creations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"tool" "members"."creation_tool" NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"kind" varchar(40) NOT NULL,
	"item_updated_at" timestamp with time zone NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"last_reserved_revision" integer DEFAULT 0 NOT NULL,
	"pending_revision" integer,
	"pending_bytes" integer,
	"pending_name" varchar(120),
	"pending_kind" varchar(40),
	"pending_item_updated_at" timestamp with time zone,
	"pending_thumb" text,
	"bytes" integer DEFAULT 0 NOT NULL,
	"storage_ref" text,
	"thumb" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "creations_user_tool_item_uq" ON "members"."creations" USING btree ("user_id","tool","item_id");--> statement-breakpoint
CREATE INDEX "creations_user_tool_idx" ON "members"."creations" USING btree ("user_id","tool","deleted_at");