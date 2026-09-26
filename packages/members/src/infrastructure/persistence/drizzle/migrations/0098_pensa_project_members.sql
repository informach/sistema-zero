CREATE TABLE "members"."pensa_project_members" (
	"project_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pensa_project_members_project_id_profile_id_pk" PRIMARY KEY("project_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "members"."pensa_projects" ADD COLUMN "share_code" varchar(8);--> statement-breakpoint
ALTER TABLE "members"."pensa_project_members" ADD CONSTRAINT "pensa_project_members_project_id_pensa_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "members"."pensa_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pensa_project_members_profile_idx" ON "members"."pensa_project_members" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pensa_projects_share_code_uq" ON "members"."pensa_projects" USING btree ("share_code") WHERE "members"."pensa_projects"."share_code" is not null;