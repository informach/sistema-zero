CREATE TABLE "members"."teacher_thread_staff_reads" (
  "thread_id" uuid NOT NULL REFERENCES "members"."teacher_threads"("id") ON DELETE CASCADE,
  "staff_user_id" uuid NOT NULL,
  "read_at" timestamp with time zone NOT NULL,
  CONSTRAINT "teacher_thread_staff_reads_thread_id_staff_user_id_pk" PRIMARY KEY("thread_id", "staff_user_id")
);
--> statement-breakpoint
CREATE INDEX "teacher_thread_staff_reads_staff_idx"
  ON "members"."teacher_thread_staff_reads" USING btree ("staff_user_id", "read_at");
