CREATE SCHEMA "helpdesk";
--> statement-breakpoint
CREATE TYPE "helpdesk"."ai_status" AS ENUM('idle', 'pending', 'processing', 'done', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "helpdesk"."auto_reply_state" AS ENUM('none', 'sending', 'sent', 'aborted');--> statement-breakpoint
CREATE TYPE "helpdesk"."connection_status" AS ENUM('connected', 'needs_reauth', 'revoked', 'disabled');--> statement-breakpoint
CREATE TYPE "helpdesk"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "helpdesk"."message_kind" AS ENUM('email', 'note');--> statement-breakpoint
CREATE TYPE "helpdesk"."message_sent_via" AS ENUM('customer', 'human', 'ai', 'gmail');--> statement-breakpoint
CREATE TYPE "helpdesk"."ticket_category" AS ENUM('curso_acesso', 'problema_tecnico', 'pagamento_reembolso', 'parceria_comercial', 'outro');--> statement-breakpoint
CREATE TYPE "helpdesk"."ticket_priority" AS ENUM('baixa', 'normal', 'alta');--> statement-breakpoint
CREATE TYPE "helpdesk"."ticket_status" AS ENUM('new', 'open', 'waiting', 'resolved', 'closed');--> statement-breakpoint
CREATE TABLE "helpdesk"."gmail_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"email_address" text NOT NULL,
	"external_id" text NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"status" "helpdesk"."connection_status" DEFAULT 'connected' NOT NULL,
	"last_history_id" text,
	"last_sync_at" timestamp with time zone,
	"sync_next_at" timestamp with time zone NOT NULL,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"last_sync_error" text,
	"connected_by" uuid NOT NULL,
	"connected_by_name" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."kb_articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_by_name" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."oauth_states" (
	"state" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'google' NOT NULL,
	"code_verifier" text,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."settings" (
	"id" text PRIMARY KEY NOT NULL,
	"auto_reply_enabled" boolean DEFAULT false NOT NULL,
	"auto_reply_categories" text[] DEFAULT '{}' NOT NULL,
	"auto_reply_confidence_min" real DEFAULT 0.75 NOT NULL,
	"signature" text DEFAULT '' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."ticket_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"kind" "helpdesk"."message_kind" DEFAULT 'email' NOT NULL,
	"gmail_message_id" text,
	"rfc822_message_id" text,
	"direction" "helpdesk"."message_direction",
	"sent_via" "helpdesk"."message_sent_via",
	"from_email" text,
	"from_name" text,
	"to_emails" text[] DEFAULT '{}' NOT NULL,
	"cc_emails" text[] DEFAULT '{}' NOT NULL,
	"subject" text,
	"body_text" text NOT NULL,
	"body_html" text,
	"snippet" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gmail_internal_date" timestamp with time zone,
	"created_by" uuid,
	"created_by_name" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk"."tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"gmail_thread_id" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"status" "helpdesk"."ticket_status" DEFAULT 'new' NOT NULL,
	"category" "helpdesk"."ticket_category",
	"category_manual" boolean DEFAULT false NOT NULL,
	"priority" "helpdesk"."ticket_priority",
	"requester_name" text,
	"requester_email" text NOT NULL,
	"assigned_to" uuid,
	"assigned_to_name" text,
	"first_message_at" timestamp with time zone NOT NULL,
	"last_message_at" timestamp with time zone NOT NULL,
	"last_inbound_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"ai_summary" text,
	"ai_summary_at" timestamp with time zone,
	"ai_draft" text,
	"ai_draft_at" timestamp with time zone,
	"ai_draft_edited" boolean DEFAULT false NOT NULL,
	"ai_classification" jsonb,
	"ai_status" "helpdesk"."ai_status" DEFAULT 'idle' NOT NULL,
	"ai_next_attempt_at" timestamp with time zone,
	"ai_attempts" integer DEFAULT 0 NOT NULL,
	"ai_last_error" text,
	"auto_reply_state" "helpdesk"."auto_reply_state" DEFAULT 'none' NOT NULL,
	"auto_replied_at" timestamp with time zone,
	"auto_reply_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "helpdesk"."ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gmail_connections_external_uq" ON "helpdesk"."gmail_connections" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "gmail_connections_claim_idx" ON "helpdesk"."gmail_connections" USING btree ("status","sync_next_at");--> statement-breakpoint
CREATE INDEX "kb_articles_published_idx" ON "helpdesk"."kb_articles" USING btree ("published","updated_at");--> statement-breakpoint
CREATE INDEX "oauth_states_expires_idx" ON "helpdesk"."oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_messages_gmail_uq" ON "helpdesk"."ticket_messages" USING btree ("gmail_message_id");--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_idx" ON "helpdesk"."ticket_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_gmail_thread_uq" ON "helpdesk"."tickets" USING btree ("gmail_thread_id");--> statement-breakpoint
CREATE INDEX "tickets_status_last_msg_idx" ON "helpdesk"."tickets" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "tickets_requester_idx" ON "helpdesk"."tickets" USING btree ("requester_email");--> statement-breakpoint
CREATE INDEX "tickets_category_idx" ON "helpdesk"."tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tickets_ai_claim_idx" ON "helpdesk"."tickets" USING btree ("ai_status","ai_next_attempt_at") WHERE "helpdesk"."tickets"."ai_status" in ('pending', 'processing');