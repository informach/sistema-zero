CREATE TABLE "marketing"."editorial_import_production_links" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"link" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_production_links" ADD CONSTRAINT "editorial_production_link_report_fk" FOREIGN KEY ("report_id") REFERENCES "marketing"."editorial_import_production_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_production_links" ADD CONSTRAINT "editorial_production_link_project_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_production_links_project_idx" ON "marketing"."editorial_import_production_links" USING btree ("project_id");