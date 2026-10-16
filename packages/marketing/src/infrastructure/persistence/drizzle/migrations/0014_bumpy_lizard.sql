CREATE TABLE "marketing"."editorial_import_entries" (
	"run_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"source_path" text NOT NULL,
	"source" jsonb NOT NULL,
	CONSTRAINT "editorial_import_entries_run_id_ordinal_pk" PRIMARY KEY("run_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_imports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"digest" text NOT NULL,
	"policy_version" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"entry_count" integer NOT NULL,
	"state" text DEFAULT 'receiving' NOT NULL,
	"received" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_entries" ADD CONSTRAINT "editorial_import_entries_run_id_editorial_imports_id_fk" FOREIGN KEY ("run_id") REFERENCES "marketing"."editorial_imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_imports" ADD CONSTRAINT "editorial_imports_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_import_path_idx" ON "marketing"."editorial_import_entries" USING btree ("run_id","source_path");--> statement-breakpoint
CREATE INDEX "editorial_imports_project_idx" ON "marketing"."editorial_imports" USING btree ("project_id","id");