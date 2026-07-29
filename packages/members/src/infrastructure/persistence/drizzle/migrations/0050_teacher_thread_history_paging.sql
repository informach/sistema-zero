CREATE INDEX "teacher_messages_thread_created_idx" ON "members"."teacher_messages" USING btree ("thread_id","created_at","id");
