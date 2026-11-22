CREATE TABLE "members"."creation_inventory_floors" (
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"tool" "members"."creation_tool" NOT NULL,
	"required_version" integer NOT NULL,
	CONSTRAINT "creation_inventory_floors_user_id_audience_tool_pk" PRIMARY KEY("user_id","audience","tool")
);
--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "pending_inventory_reader" jsonb;--> statement-breakpoint
CREATE INDEX "creation_inventory_floors_account_idx" ON "members"."creation_inventory_floors" USING btree ("account_id");