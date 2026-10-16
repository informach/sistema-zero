CREATE TABLE "marketing"."engagement_activations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"publication_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"plan" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"state" text NOT NULL,
	"reason" text,
	"external_post_id" text,
	"verified_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."engagement_approvals" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	"approved_by" uuid NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."engagement_channels" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"connection_id" text NOT NULL,
	"graph_version" text NOT NULL,
	"proof" jsonb,
	"retention_days" integer DEFAULT 90 NOT NULL,
	"max_sends_per_hour" integer DEFAULT 30 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."engagement_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"recipient_key" text NOT NULL,
	"recipient_enc" text,
	"version" integer DEFAULT 1 NOT NULL,
	"state" text DEFAULT 'automatic' NOT NULL,
	"owner_id" uuid,
	"suppression" text,
	"last_inbound_at" timestamp with time zone,
	"typed_reply_sent" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."engagement_inbound" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"event" jsonb,
	"conversation_id" uuid,
	"state" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."engagement_journeys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"activation_id" uuid NOT NULL,
	"state" text NOT NULL,
	"previous_state" text,
	"comment_id" text,
	"opened_at" timestamp with time zone,
	"interacted_at" timestamp with time zone,
	"offered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing"."engagement_members" (
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permissions" jsonb NOT NULL,
	CONSTRAINT "engagement_members_account_id_user_id_pk" PRIMARY KEY("account_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "marketing"."engagement_outbound" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"journey_id" uuid,
	"logical_key" text NOT NULL,
	"kind" text NOT NULL,
	"message" jsonb,
	"comment_id" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_id" text,
	"error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketing"."engagement_receipts" (
	"account_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engagement_receipts_account_id_actor_id_operation_id_pk" PRIMARY KEY("account_id","actor_id","operation_id")
);
--> statement-breakpoint
ALTER TABLE "marketing"."engagement_activations" ADD CONSTRAINT "engagement_activations_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_activations" ADD CONSTRAINT "engagement_activations_revision_id_engagement_approvals_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "marketing"."engagement_approvals"("revision_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_activations" ADD CONSTRAINT "engagement_activations_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "marketing"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_activations" ADD CONSTRAINT "engagement_activations_account_id_engagement_channels_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "marketing"."engagement_channels"("account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_approvals" ADD CONSTRAINT "engagement_approvals_revision_id_editorial_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "marketing"."editorial_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_approvals" ADD CONSTRAINT "engagement_approvals_project_id_editorial_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "marketing"."editorial_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_channels" ADD CONSTRAINT "engagement_channels_account_id_social_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "marketing"."social_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_conversations" ADD CONSTRAINT "engagement_conversations_account_id_engagement_channels_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "marketing"."engagement_channels"("account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_inbound" ADD CONSTRAINT "engagement_inbound_account_id_engagement_channels_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "marketing"."engagement_channels"("account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_inbound" ADD CONSTRAINT "engagement_inbound_conversation_id_engagement_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "marketing"."engagement_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_journeys" ADD CONSTRAINT "engagement_journeys_conversation_id_engagement_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "marketing"."engagement_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_journeys" ADD CONSTRAINT "engagement_journeys_activation_id_engagement_activations_id_fk" FOREIGN KEY ("activation_id") REFERENCES "marketing"."engagement_activations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_members" ADD CONSTRAINT "engagement_members_account_id_engagement_channels_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "marketing"."engagement_channels"("account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_outbound" ADD CONSTRAINT "engagement_outbound_account_id_engagement_channels_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "marketing"."engagement_channels"("account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_outbound" ADD CONSTRAINT "engagement_outbound_conversation_id_engagement_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "marketing"."engagement_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_outbound" ADD CONSTRAINT "engagement_outbound_journey_id_engagement_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "marketing"."engagement_journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing"."engagement_receipts" ADD CONSTRAINT "engagement_receipts_account_id_engagement_channels_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "marketing"."engagement_channels"("account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "engagement_activation_project_idx" ON "marketing"."engagement_activations" USING btree ("project_id","piece_id");--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_activation_live_post_idx" ON "marketing"."engagement_activations" USING btree ("account_id","external_post_id") WHERE "marketing"."engagement_activations"."state"='active';--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_activation_identity_idx" ON "marketing"."engagement_activations" USING btree ("account_id","publication_id","revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_recipient_idx" ON "marketing"."engagement_conversations" USING btree ("account_id","recipient_key");--> statement-breakpoint
CREATE INDEX "engagement_inbox_idx" ON "marketing"."engagement_conversations" USING btree ("account_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_event_idx" ON "marketing"."engagement_inbound" USING btree ("account_id","event_key");--> statement-breakpoint
CREATE INDEX "engagement_pending_idx" ON "marketing"."engagement_inbound" USING btree ("state","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_one_journey_idx" ON "marketing"."engagement_journeys" USING btree ("conversation_id") WHERE "marketing"."engagement_journeys"."state" <> 'closed';--> statement-breakpoint
CREATE UNIQUE INDEX "engagement_intent_idx" ON "marketing"."engagement_outbound" USING btree ("account_id","logical_key");--> statement-breakpoint
CREATE INDEX "engagement_dispatch_idx" ON "marketing"."engagement_outbound" USING btree ("state","available_at");