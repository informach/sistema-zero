CREATE TABLE "marketing"."editorial_import_releases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"verified_run_id" uuid NOT NULL,
	"release" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_releases" ADD CONSTRAINT "editorial_import_releases_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_releases" ADD CONSTRAINT "editorial_import_releases_run_id_editorial_imports_id_fk" FOREIGN KEY ("run_id") REFERENCES "marketing"."editorial_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_releases" ADD CONSTRAINT "editorial_import_releases_verified_run_id_editorial_imports_id_fk" FOREIGN KEY ("verified_run_id") REFERENCES "marketing"."editorial_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_import_releases_run_idx" ON "marketing"."editorial_import_releases" USING btree ("project_id","run_id","created_at","id");