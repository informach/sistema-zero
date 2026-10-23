CREATE TABLE "marketing"."editorial_editions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"representation_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"edition" jsonb NOT NULL,
	"approved_by" uuid NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_editions" ADD CONSTRAINT "editorial_editions_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_editions" ADD CONSTRAINT "editorial_editions_representation_id_editorial_items_id_fk" FOREIGN KEY ("representation_id") REFERENCES "marketing"."editorial_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_editions_representation_idx" ON "marketing"."editorial_editions" USING btree ("project_id","representation_id","id");