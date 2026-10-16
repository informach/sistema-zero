CREATE TABLE "marketing"."editorial_import_products" (
	"project_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"product" text NOT NULL,
	"include_shared" boolean NOT NULL,
	"revision_id" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_import_products_project_id_origin_pk" PRIMARY KEY("project_id","origin")
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_products" ADD CONSTRAINT "editorial_import_products_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;