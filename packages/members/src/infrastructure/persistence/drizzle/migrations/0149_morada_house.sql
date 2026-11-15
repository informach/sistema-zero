CREATE TABLE "members"."morada_houses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" "members"."course_audience" NOT NULL,
	"house" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "morada_houses_user_audience_uq" ON "members"."morada_houses" USING btree ("user_id","audience");