CREATE TABLE "members"."live_materials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"title" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "live_materials_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "members"."live_recording_jobs" ADD COLUMN "command_version" integer DEFAULT 0 NOT NULL;