CREATE TABLE "hub"."studio_publication_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"scope_key" text,
	"idempotency_key" text NOT NULL,
	"play_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"account_id" uuid,
	"audience" "hub"."audience" NOT NULL,
	"context" text,
	"semantic_hash" text,
	"snapshot_hash" text,
	"phase" text NOT NULL,
	"thread_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "studio_reservations_scope_uq" ON "hub"."studio_publication_reservations" USING btree ("scope_key");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_reservations_idempotency_uq" ON "hub"."studio_publication_reservations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "studio_reservations_new_play_uq" ON "hub"."studio_publication_reservations" USING btree ("play_id") WHERE "hub"."studio_publication_reservations"."snapshot_hash" is not null;--> statement-breakpoint
CREATE INDEX "studio_reservations_thread_idx" ON "hub"."studio_publication_reservations" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "studio_reservations_account_idx" ON "hub"."studio_publication_reservations" USING btree ("account_id");