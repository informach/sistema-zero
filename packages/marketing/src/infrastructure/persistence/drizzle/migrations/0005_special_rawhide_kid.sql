CREATE TABLE "marketing"."editorial_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"manifest" jsonb NOT NULL,
	"storage_key" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_changes" (
	"project_id" uuid NOT NULL,
	"sequence" bigint NOT NULL,
	"type" text NOT NULL,
	"entity_id" uuid,
	"revision_id" uuid,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_changes_project_id_sequence_pk" PRIMARY KEY("project_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"revision_id" uuid NOT NULL,
	"document" jsonb NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_members" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permissions" jsonb NOT NULL,
	CONSTRAINT "editorial_members_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"product" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sequence" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_receipts" (
	"project_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_receipts_project_id_actor_id_operation_id_pk" PRIMARY KEY("project_id","actor_id","operation_id")
);
--> statement-breakpoint
CREATE TABLE "marketing"."editorial_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"parent_revision_id" uuid,
	"document" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_assets" ADD CONSTRAINT "editorial_assets_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_changes" ADD CONSTRAINT "editorial_changes_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_items" ADD CONSTRAINT "editorial_items_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_members" ADD CONSTRAINT "editorial_members_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_receipts" ADD CONSTRAINT "editorial_receipts_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_revisions" ADD CONSTRAINT "editorial_revisions_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."editorial_revisions" ADD CONSTRAINT "editorial_revisions_entity_id_editorial_items_id_fk" FOREIGN KEY ("entity_id") REFERENCES "marketing"."editorial_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editorial_assets_project_idx" ON "marketing"."editorial_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "editorial_items_project_idx" ON "marketing"."editorial_items" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_items_project_id_idx" ON "marketing"."editorial_items" USING btree ("project_id","id");--> statement-breakpoint
CREATE INDEX "editorial_members_user_idx" ON "marketing"."editorial_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "editorial_revisions_entity_idx" ON "marketing"."editorial_revisions" USING btree ("project_id","entity_id");