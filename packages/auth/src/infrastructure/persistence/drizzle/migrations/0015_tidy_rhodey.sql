CREATE TABLE "auth"."refresh_token_families" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"impersonator_user_id" uuid,
	"impersonation_writable" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "auth"."refresh_token_families" (
	"id",
	"user_id",
	"impersonator_user_id",
	"impersonation_writable",
	"expires_at",
	"revoked_at",
	"created_at",
	"updated_at"
)
SELECT
	latest."family_id",
	latest."user_id",
	latest."impersonator_user_id",
	latest."impersonation_writable",
	aggregated."expires_at",
	aggregated."revoked_at",
	aggregated."created_at",
	aggregated."updated_at"
FROM (
	SELECT DISTINCT ON ("family_id")
		"family_id",
		"user_id",
		"impersonator_user_id",
		"impersonation_writable"
	FROM "auth"."refresh_tokens"
	ORDER BY "family_id", "created_at" DESC
) AS latest
JOIN (
	SELECT
		"family_id",
		MAX("expires_at") AS "expires_at",
		CASE
			WHEN COUNT(*) FILTER (WHERE "revoked_at" IS NULL) = 0 THEN MAX("revoked_at")
			ELSE NULL
		END AS "revoked_at",
		MIN("created_at") AS "created_at",
		MAX("created_at") AS "updated_at"
	FROM "auth"."refresh_tokens"
	GROUP BY "family_id"
) AS aggregated ON aggregated."family_id" = latest."family_id";
--> statement-breakpoint
CREATE INDEX "refresh_token_families_user_idx" ON "auth"."refresh_token_families" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_token_families_expires_idx" ON "auth"."refresh_token_families" USING btree ("expires_at");
