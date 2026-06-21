CREATE TABLE "members"."avatar_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"equipped" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."avatar_inventory" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"part_id" text NOT NULL,
	"acquired_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "avatar_configs_user_audience_uq" ON "members"."avatar_configs" USING btree ("user_id","audience");--> statement-breakpoint
CREATE UNIQUE INDEX "avatar_inventory_user_part_uq" ON "members"."avatar_inventory" USING btree ("user_id","audience","part_id");