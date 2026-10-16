CREATE TABLE "marketing"."editorial_production_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replaces_id" uuid,
	"replaced_by" uuid,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"body" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_production_records" ADD CONSTRAINT "editorial_production_records_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_production_project_idx" ON "marketing"."editorial_production_records" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "editorial_production_actor_idx" ON "marketing"."editorial_production_records" USING btree ("actor_id");