CREATE TABLE "marketing"."editorial_import_source_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"source_path" text NOT NULL,
	"source_hash" text NOT NULL,
	"previous_source_version" boolean NOT NULL,
	"destinations" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_entries" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_source_versions" ADD CONSTRAINT "editorial_import_source_versions_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_import_source_identity_idx" ON "marketing"."editorial_import_source_versions" USING btree ("project_id","origin","source_path","source_hash");