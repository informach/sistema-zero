CREATE TABLE "auth"."profile_voice_input_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"account_user_id" uuid NOT NULL,
	"enabled" boolean NOT NULL,
	"actor" text NOT NULL,
	"impersonator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_voice_input_events_actor_ck" CHECK (("auth"."profile_voice_input_events"."actor" = 'parent' and "auth"."profile_voice_input_events"."impersonator_id" is null) or ("auth"."profile_voice_input_events"."actor" = 'support' and "auth"."profile_voice_input_events"."impersonator_id" is not null and "auth"."profile_voice_input_events"."enabled" = false))
);
--> statement-breakpoint
ALTER TABLE "auth"."profile_voice_input_events" ADD CONSTRAINT "profile_voice_input_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "auth"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_voice_input_events_profile_created_idx" ON "auth"."profile_voice_input_events" USING btree ("profile_id","created_at");