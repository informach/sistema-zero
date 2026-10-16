CREATE TABLE "marketing"."editorial_deliveries" (
	"publication_id" uuid PRIMARY KEY NOT NULL,
	"content_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"representation_id" uuid NOT NULL,
	"source_publication_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_deliveries" ADD CONSTRAINT "editorial_deliveries_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "marketing"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_deliveries" ADD CONSTRAINT "editorial_deliveries_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "marketing"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_deliveries" ADD CONSTRAINT "editorial_deliveries_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_deliveries" ADD CONSTRAINT "editorial_deliveries_edition_id_editorial_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "marketing"."editorial_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_deliveries" ADD CONSTRAINT "editorial_deliveries_representation_id_editorial_items_id_fk" FOREIGN KEY ("representation_id") REFERENCES "marketing"."editorial_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_deliveries" ADD CONSTRAINT "editorial_deliveries_source_publication_id_publications_id_fk" FOREIGN KEY ("source_publication_id") REFERENCES "marketing"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_deliveries_content_idx" ON "marketing"."editorial_deliveries" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "editorial_deliveries_representation_idx" ON "marketing"."editorial_deliveries" USING btree ("project_id","representation_id","created_at","publication_id");