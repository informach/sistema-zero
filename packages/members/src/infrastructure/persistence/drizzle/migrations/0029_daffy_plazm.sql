CREATE TYPE "members"."course_level" AS ENUM('iniciante', 'intermediario', 'avancado');--> statement-breakpoint
ALTER TYPE "members"."xp_source_type" ADD VALUE 'course_showcased';--> statement-breakpoint
ALTER TABLE "members"."courses" ADD COLUMN "level" "members"."course_level" DEFAULT 'iniciante' NOT NULL;