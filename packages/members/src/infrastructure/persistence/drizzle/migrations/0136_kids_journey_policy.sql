CREATE TABLE "members"."kids_journey_earned" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"level" text NOT NULL,
	"capabilities" jsonb NOT NULL,
	"entry_tiers" text[] DEFAULT array[]::text[] NOT NULL,
	"expanded_tiers" text[] DEFAULT array[]::text[] NOT NULL,
	"reward_tiers" text[] DEFAULT array[]::text[] NOT NULL,
	"policy_version" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "kids_journey_earned_level_check" CHECK ("members"."kids_journey_earned"."level" in ('noob','coder','hacker','explorer','elite','architect','champion','god')),
	CONSTRAINT "kids_journey_earned_version_check" CHECK ("members"."kids_journey_earned"."policy_version" >= 0),
	CONSTRAINT "kids_journey_earned_access_check" CHECK ("members"."kids_journey_earned"."entry_tiers" <@ array['primeiros-passos-2d','iniciante-2d','iniciante-3d','intermediario-2d','intermediario-3d','avancado-2d','avancado-3d']::text[] and "members"."kids_journey_earned"."reward_tiers" <@ array['primeiros-passos-2d','iniciante-2d','iniciante-3d','intermediario-2d','intermediario-3d','avancado-2d','avancado-3d']::text[] and "members"."kids_journey_earned"."expanded_tiers" <@ "members"."kids_journey_earned"."entry_tiers" and cardinality("members"."kids_journey_earned"."entry_tiers") <= 7 and cardinality("members"."kids_journey_earned"."expanded_tiers") <= 7 and cardinality("members"."kids_journey_earned"."reward_tiers") <= 7),
	CONSTRAINT "kids_journey_earned_capabilities_check" CHECK (jsonb_typeof("members"."kids_journey_earned"."capabilities") = 'array' and "members"."kids_journey_earned"."capabilities" <@ '["studio","pinta","bridge","pro","ai","pensa","molda","molda-intermediate","molda-professional"]'::jsonb)
);
--> statement-breakpoint
CREATE TABLE "members"."kids_journey_policy" (
	"id" text PRIMARY KEY DEFAULT 'kids' NOT NULL,
	"version" integer NOT NULL,
	"phase" text NOT NULL,
	"policy" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "kids_journey_policy_id_check" CHECK ("members"."kids_journey_policy"."id" = 'kids'),
	CONSTRAINT "kids_journey_policy_version_check" CHECK (("members"."kids_journey_policy"."phase" = 'initializing' and "members"."kids_journey_policy"."version" = 0) or ("members"."kids_journey_policy"."phase" = 'published' and "members"."kids_journey_policy"."version" >= 1)),
	CONSTRAINT "kids_journey_policy_shape_check" CHECK (jsonb_typeof("members"."kids_journey_policy"."policy") = 'object' and "members"."kids_journey_policy"."policy"->>'schemaVersion' = '1' and "members"."kids_journey_policy"."policy"->>'mode' in ('active','paused') and jsonb_typeof("members"."kids_journey_policy"."policy"->'steps') = 'array' and jsonb_typeof("members"."kids_journey_policy"."policy"->'tierAccess') = 'array')
);
--> statement-breakpoint
CREATE TABLE "members"."kids_journey_preparation_owners" (
	"preparation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	CONSTRAINT "kids_journey_preparation_owners_preparation_id_user_id_pk" PRIMARY KEY("preparation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "members"."kids_journey_preparations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expected_version" integer NOT NULL,
	"source_policy" jsonb NOT NULL,
	"candidate_policy" jsonb NOT NULL,
	"draft_hash" varchar(64) NOT NULL,
	"catalog_hash" varchar(64) NOT NULL,
	"cohort_hash" varchar(64),
	"origin" text NOT NULL,
	"capture_stage" text NOT NULL,
	"capture_cursor" uuid,
	"catalog" jsonb NOT NULL,
	"cursor" uuid,
	"upper_bound" uuid,
	"processed" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_id" uuid,
	"reason" varchar(500) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "kids_journey_preparations_version_check" CHECK ("members"."kids_journey_preparations"."expected_version" >= 0),
	CONSTRAINT "kids_journey_preparations_count_check" CHECK ("members"."kids_journey_preparations"."processed" >= 0),
	CONSTRAINT "kids_journey_preparations_status_check" CHECK ("members"."kids_journey_preparations"."status" in ('capturing','preparing','ready','stale','published')),
	CONSTRAINT "kids_journey_preparations_reason_check" CHECK (length(btrim("members"."kids_journey_preparations"."reason")) between 1 and 500),
	CONSTRAINT "kids_journey_preparations_hash_check" CHECK ("members"."kids_journey_preparations"."draft_hash" ~ '^[a-f0-9]{64}$' and "members"."kids_journey_preparations"."catalog_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "kids_journey_preparations_catalog_check" CHECK (jsonb_typeof("members"."kids_journey_preparations"."catalog") = 'array'),
	CONSTRAINT "kids_journey_preparations_actor_check" CHECK (("members"."kids_journey_preparations"."actor_kind" = 'system' and "members"."kids_journey_preparations"."actor_id" is null and "members"."kids_journey_preparations"."origin" = 'seed' and "members"."kids_journey_preparations"."expected_version" = 0) or ("members"."kids_journey_preparations"."actor_kind" = 'user' and "members"."kids_journey_preparations"."actor_id" is not null and "members"."kids_journey_preparations"."origin" = 'configuration' and "members"."kids_journey_preparations"."expected_version" >= 1)),
	CONSTRAINT "kids_journey_preparations_capture_check" CHECK ("members"."kids_journey_preparations"."capture_stage" in ('auth','members','hashing','done') and ("members"."kids_journey_preparations"."status" not in ('preparing','ready','published') or ("members"."kids_journey_preparations"."capture_stage" = 'done' and "members"."kids_journey_preparations"."cohort_hash" is not null and "members"."kids_journey_preparations"."cohort_hash" ~ '^[a-f0-9]{64}$'))),
	CONSTRAINT "kids_journey_preparations_cursor_check" CHECK ("members"."kids_journey_preparations"."cursor" is null or ("members"."kids_journey_preparations"."upper_bound" is not null and "members"."kids_journey_preparations"."cursor" <= "members"."kids_journey_preparations"."upper_bound"))
);
--> statement-breakpoint
CREATE TABLE "members"."kids_journey_revisions" (
	"version" integer PRIMARY KEY NOT NULL,
	"previous_version" integer NOT NULL,
	"preparation_id" uuid NOT NULL,
	"policy" jsonb NOT NULL,
	"draft_hash" varchar(64) NOT NULL,
	"catalog_hash" varchar(64) NOT NULL,
	"cohort_hash" varchar(64) NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_id" uuid,
	"reason" varchar(500) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "kids_journey_revisions_version_check" CHECK ("members"."kids_journey_revisions"."version" >= 1 and "members"."kids_journey_revisions"."previous_version" = "members"."kids_journey_revisions"."version" - 1),
	CONSTRAINT "kids_journey_revisions_reason_check" CHECK (length(btrim("members"."kids_journey_revisions"."reason")) between 1 and 500),
	CONSTRAINT "kids_journey_revisions_actor_check" CHECK (("members"."kids_journey_revisions"."actor_kind" = 'system' and "members"."kids_journey_revisions"."actor_id" is null and "members"."kids_journey_revisions"."version" = 1) or ("members"."kids_journey_revisions"."actor_kind" = 'user' and "members"."kids_journey_revisions"."actor_id" is not null and "members"."kids_journey_revisions"."version" >= 2)),
	CONSTRAINT "kids_journey_revisions_hash_check" CHECK ("members"."kids_journey_revisions"."draft_hash" ~ '^[a-f0-9]{64}$' and "members"."kids_journey_revisions"."catalog_hash" ~ '^[a-f0-9]{64}$' and "members"."kids_journey_revisions"."cohort_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "members"."kids_journey_preparation_owners" ADD CONSTRAINT "kids_journey_preparation_owners_preparation_id_kids_journey_preparations_id_fk" FOREIGN KEY ("preparation_id") REFERENCES "members"."kids_journey_preparations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."kids_journey_revisions" ADD CONSTRAINT "kids_journey_revisions_preparation_id_kids_journey_preparations_id_fk" FOREIGN KEY ("preparation_id") REFERENCES "members"."kids_journey_preparations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kids_journey_earned_account_idx" ON "members"."kids_journey_earned" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "kids_journey_preparation_owners_account_idx" ON "members"."kids_journey_preparation_owners" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "kids_journey_preparations_status_idx" ON "members"."kids_journey_preparations" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "kids_journey_revisions_preparation_uq" ON "members"."kids_journey_revisions" USING btree ("preparation_id");