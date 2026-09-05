ALTER TYPE "helpdesk"."message_delivery_state" ADD VALUE 'failed';--> statement-breakpoint
ALTER TABLE "helpdesk"."settings" DROP COLUMN "auto_reply_enabled";--> statement-breakpoint
ALTER TABLE "helpdesk"."settings" DROP COLUMN "auto_reply_categories";--> statement-breakpoint
ALTER TABLE "helpdesk"."settings" DROP COLUMN "auto_reply_confidence_min";--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" DROP COLUMN "auto_reply_state";--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" DROP COLUMN "auto_replied_at";--> statement-breakpoint
ALTER TABLE "helpdesk"."tickets" DROP COLUMN "auto_reply_reason";--> statement-breakpoint
DROP TYPE "helpdesk"."auto_reply_state";