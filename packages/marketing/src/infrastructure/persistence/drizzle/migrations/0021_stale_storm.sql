CREATE TABLE "marketing"."editorial_import_production_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"report" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_import_source_texts" (
	"source_version_id" uuid PRIMARY KEY NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_production_reports" ADD CONSTRAINT "editorial_import_production_reports_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_production_reports" ADD CONSTRAINT "editorial_import_production_reports_run_id_editorial_imports_id_fk" FOREIGN KEY ("run_id") REFERENCES "marketing"."editorial_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_source_texts" ADD CONSTRAINT "editorial_import_source_texts_source_version_id_editorial_import_source_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "marketing"."editorial_import_source_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_import_production_reports_run_idx" ON "marketing"."editorial_import_production_reports" USING btree ("project_id","run_id","id");