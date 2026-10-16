CREATE TABLE "marketing"."editorial_import_office_texts" (
	"project_id" uuid NOT NULL,
	"source_version_id" uuid NOT NULL,
	"parser_version" text NOT NULL,
	"text_hash" text NOT NULL,
	"destinations" jsonb NOT NULL,
	"notes" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_import_office_texts_project_id_source_version_id_parser_version_pk" PRIMARY KEY("project_id","source_version_id","parser_version")
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_office_texts" ADD CONSTRAINT "editorial_import_office_source_fk" FOREIGN KEY ("project_id","source_version_id") REFERENCES "marketing"."editorial_import_source_versions"("project_id","id") ON DELETE no action ON UPDATE no action;