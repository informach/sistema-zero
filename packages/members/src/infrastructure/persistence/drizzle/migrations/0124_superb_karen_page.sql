CREATE TABLE "members"."studio_builder_project_deletions" (
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "studio_builder_project_deletions_account_id_user_id_project_id_pk" PRIMARY KEY("account_id","user_id","project_id")
);
--> statement-breakpoint
CREATE INDEX "studio_builder_project_deletion_expiry_idx" ON "members"."studio_builder_project_deletions" USING btree ("expires_at");