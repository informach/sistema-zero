CREATE TABLE "members"."room_inventory" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"item_id" text NOT NULL,
	"acquired_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members"."room_state" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" "members"."course_audience" DEFAULT 'kids' NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "room_inventory_user_item_uq" ON "members"."room_inventory" USING btree ("user_id","audience","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_state_user_audience_uq" ON "members"."room_state" USING btree ("user_id","audience");