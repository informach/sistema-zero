CREATE SCHEMA "messaging";
--> statement-breakpoint
CREATE TYPE "messaging"."channel" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "messaging"."email_sender_status" AS ENUM('VERIFIED', 'UNVERIFIED');--> statement-breakpoint
CREATE TYPE "messaging"."whatsapp_instance_status" AS ENUM('CONNECTED', 'DISCONNECTED', 'PAUSED', 'BANNED');--> statement-breakpoint
CREATE TYPE "messaging"."message_status" AS ENUM('QUEUED', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SUPPRESSED');--> statement-breakpoint
CREATE TYPE "messaging"."outbox_status" AS ENUM('PENDING', 'PUBLISHED', 'DEAD');--> statement-breakpoint
CREATE TABLE "messaging"."email_senders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text NOT NULL,
	"reply_to" text,
	"status" "messaging"."email_sender_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging"."message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"channel" "messaging"."channel" NOT NULL,
	"name" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "messaging"."channel" NOT NULL,
	"template_key" text NOT NULL,
	"template_id" uuid,
	"recipient_name" text NOT NULL,
	"recipient_email" text,
	"recipient_phone" text,
	"variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rendered_subject" text,
	"rendered_body" text NOT NULL,
	"sender_id" uuid,
	"lane_id" uuid,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" "messaging"."message_status" DEFAULT 'QUEUED' NOT NULL,
	"provider_message_id" text,
	"failure_reason" text,
	"failure_code" text,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"consumer_id" text,
	"idempotency_key" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"terminal_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messaging"."outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_name" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "messaging"."outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messaging"."suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "messaging"."channel" NOT NULL,
	"address" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging"."webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"message_id" uuid,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messaging"."whatsapp_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_name" text NOT NULL,
	"phone_number" text NOT NULL,
	"status" "messaging"."whatsapp_instance_status" DEFAULT 'DISCONNECTED' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"daily_cap" integer DEFAULT 200 NOT NULL,
	"sent_today" integer DEFAULT 0 NOT NULL,
	"day_cursor" date,
	"messages_since_rest" integer DEFAULT 0 NOT NULL,
	"next_available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"warmup_started_at" timestamp with time zone,
	"weight" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_senders_from_email_uq" ON "messaging"."email_senders" USING btree ("from_email");--> statement-breakpoint
CREATE UNIQUE INDEX "email_senders_single_default_uq" ON "messaging"."email_senders" USING btree ("is_default") WHERE "messaging"."email_senders"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_channel_key_uq" ON "messaging"."message_templates" USING btree ("channel","key");--> statement-breakpoint
CREATE INDEX "messages_dispatch_idx" ON "messaging"."messages" USING btree ("channel","status","scheduled_at","next_attempt_at");--> statement-breakpoint
CREATE INDEX "messages_provider_message_id_idx" ON "messaging"."messages" USING btree ("provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_idempotency_uq" ON "messaging"."messages" USING btree ("consumer_id","idempotency_key") WHERE "messaging"."messages"."consumer_id" is not null and "messaging"."messages"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "outbox_status_created_idx" ON "messaging"."outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "suppressions_channel_address_uq" ON "messaging"."suppressions" USING btree ("channel","address");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_uq" ON "messaging"."webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_instances_instance_name_uq" ON "messaging"."whatsapp_instances" USING btree ("instance_name");--> statement-breakpoint
CREATE INDEX "whatsapp_instances_dispatch_idx" ON "messaging"."whatsapp_instances" USING btree ("enabled","status","next_available_at");