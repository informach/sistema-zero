ALTER TABLE "members"."zappy_knowledge_sources" ADD COLUMN "block_id" uuid;--> statement-breakpoint
ALTER TABLE "members"."zappy_knowledge_sources" ADD COLUMN "block_revision" varchar(32);--> statement-breakpoint
ALTER TABLE "members"."zappy_messages" ADD COLUMN "processing_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members"."zappy_knowledge_sources" ADD CONSTRAINT "zappy_knowledge_sources_block_id_lesson_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "members"."lesson_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "zappy_knowledge_block_idx" ON "members"."zappy_knowledge_sources" USING btree ("block_id");