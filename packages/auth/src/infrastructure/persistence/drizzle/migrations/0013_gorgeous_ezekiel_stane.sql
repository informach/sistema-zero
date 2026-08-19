CREATE TABLE "auth"."user_deletion_receipts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"profile_ids" uuid[] NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
