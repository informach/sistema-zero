CREATE TABLE "members"."live_learning_attempts" (
	"session_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"document" jsonb NOT NULL,
	CONSTRAINT "live_learning_attempts_session_id_learner_id_id_pk" PRIMARY KEY("session_id","learner_id","id")
);
--> statement-breakpoint
CREATE TABLE "members"."live_learning_progress" (
	"session_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"revision" uuid NOT NULL,
	"document" jsonb NOT NULL,
	CONSTRAINT "live_learning_progress_session_id_learner_id_block_id_revision_pk" PRIMARY KEY("session_id","learner_id","block_id","revision")
);
--> statement-breakpoint
ALTER TABLE "members"."live_learning_attempts" ADD CONSTRAINT "live_learning_attempts_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "members"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members"."live_learning_progress" ADD CONSTRAINT "live_learning_progress_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "members"."live_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_learning_attempts_account_idx" ON "members"."live_learning_attempts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "live_learning_progress_account_idx" ON "members"."live_learning_progress" USING btree ("account_id");