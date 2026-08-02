CREATE TABLE "members"."zappy_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "zappy_conversations_profile_project_uq" ON "members"."zappy_conversations" USING btree ("user_id","project_id");
--> statement-breakpoint
CREATE INDEX "zappy_conversations_account_idx" ON "members"."zappy_conversations" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX "zappy_conversations_expiry_idx" ON "members"."zappy_conversations" USING btree ("expires_at");
--> statement-breakpoint
CREATE TABLE "members"."zappy_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"reply_to_id" uuid,
	"client_message_id" uuid,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"response" jsonb,
	"scope" varchar(40),
	"latency_ms" integer,
	"outcome" varchar(24),
	"useful" boolean,
	"feedback_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "zappy_messages_role_ck" CHECK ("members"."zappy_messages"."role" in ('user', 'assistant'))
);
--> statement-breakpoint
ALTER TABLE "members"."zappy_messages" ADD CONSTRAINT "zappy_messages_conversation_id_zappy_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "members"."zappy_conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "members"."zappy_messages" ADD CONSTRAINT "zappy_messages_reply_to_id_zappy_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "members"."zappy_messages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "zappy_messages_conversation_created_idx" ON "members"."zappy_messages" USING btree ("conversation_id","created_at","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "zappy_messages_client_id_uq" ON "members"."zappy_messages" USING btree ("conversation_id","client_message_id") WHERE "client_message_id" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX "zappy_messages_reply_uq" ON "members"."zappy_messages" USING btree ("reply_to_id") WHERE "reply_to_id" is not null;
--> statement-breakpoint
CREATE TABLE "members"."zappy_knowledge_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"source_ref" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"status" varchar(24) NOT NULL,
	"error" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."zappy_knowledge_sources" ADD CONSTRAINT "zappy_knowledge_sources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "members"."courses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "members"."zappy_knowledge_sources" ADD CONSTRAINT "zappy_knowledge_sources_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "members"."lessons"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "zappy_knowledge_source_uq" ON "members"."zappy_knowledge_sources" USING btree ("lesson_id","source_type","source_ref");
--> statement-breakpoint
CREATE INDEX "zappy_knowledge_course_lesson_idx" ON "members"."zappy_knowledge_sources" USING btree ("course_id","lesson_id");
--> statement-breakpoint
CREATE INDEX "zappy_knowledge_status_idx" ON "members"."zappy_knowledge_sources" USING btree ("status");
--> statement-breakpoint
CREATE TABLE "members"."zappy_knowledge_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL,
	"normalized_text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members"."zappy_knowledge_chunks" ADD CONSTRAINT "zappy_knowledge_chunks_source_id_zappy_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "members"."zappy_knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "zappy_knowledge_chunk_position_uq" ON "members"."zappy_knowledge_chunks" USING btree ("source_id","position");
--> statement-breakpoint
CREATE INDEX "zappy_knowledge_chunk_source_idx" ON "members"."zappy_knowledge_chunks" USING btree ("source_id");
--> statement-breakpoint
CREATE INDEX "zappy_knowledge_chunk_fts_idx" ON "members"."zappy_knowledge_chunks" USING gin (to_tsvector('portuguese', "normalized_text"));
