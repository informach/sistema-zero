CREATE TABLE "members"."live_replay_positions" (
	"session_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"position_seconds" integer NOT NULL,
	CONSTRAINT "live_replay_positions_session_id_learner_id_version_pk" PRIMARY KEY("session_id","learner_id","version")
);
--> statement-breakpoint
ALTER TABLE "members"."live_replay_positions" ADD CONSTRAINT "live_replay_positions_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "members"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_replay_positions_account_idx" ON "members"."live_replay_positions" USING btree ("account_id");