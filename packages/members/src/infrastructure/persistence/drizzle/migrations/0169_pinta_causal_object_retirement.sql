CREATE TABLE "members"."pinta_causal_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"object_key" text NOT NULL,
	"requires_fence" boolean NOT NULL,
	"not_before" timestamp with time zone NOT NULL,
	"locked_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pinta_causal_objects_key_uq" ON "members"."pinta_causal_objects" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "pinta_causal_objects_due_idx" ON "members"."pinta_causal_objects" USING btree ("not_before");