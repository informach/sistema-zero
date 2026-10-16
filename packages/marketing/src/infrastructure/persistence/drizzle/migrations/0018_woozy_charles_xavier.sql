CREATE TABLE "marketing"."editorial_import_structures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"source_version_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	"section_key" text NOT NULL,
	"parser_version" text NOT NULL,
	"sequence" bigint NOT NULL,
	"destinations" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_structures" ADD CONSTRAINT "editorial_import_structures_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_structures" ADD CONSTRAINT "editorial_structure_source_fk" FOREIGN KEY ("project_id","source_version_id") REFERENCES "marketing"."editorial_import_source_versions"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_structure_version_idx" ON "marketing"."editorial_import_structures" USING btree ("source_version_id","section_key","parser_version");--> statement-breakpoint
CREATE INDEX "editorial_structure_piece_idx" ON "marketing"."editorial_import_structures" USING btree ("project_id","piece_id","sequence");