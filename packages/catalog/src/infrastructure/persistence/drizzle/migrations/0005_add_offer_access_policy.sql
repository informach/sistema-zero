CREATE TYPE "catalog"."access_duration_unit" AS ENUM('days', 'months');--> statement-breakpoint
CREATE TYPE "catalog"."access_mode" AS ENUM('lifetime', 'fixed', 'billing_cycle');--> statement-breakpoint
ALTER TABLE "catalog"."offers" ADD COLUMN "access_mode" "catalog"."access_mode";--> statement-breakpoint
ALTER TABLE "catalog"."offers" ADD COLUMN "access_duration_value" integer;--> statement-breakpoint
ALTER TABLE "catalog"."offers" ADD COLUMN "access_duration_unit" "catalog"."access_duration_unit";