CREATE TABLE "members"."entitlement_lifecycle_messages_sent" (
	"entitlement_id" uuid NOT NULL,
	"expires_on" date NOT NULL,
	"message_kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlement_lifecycle_messages_sent_pk" PRIMARY KEY("entitlement_id","expires_on","message_kind")
);
--> statement-breakpoint
ALTER TABLE "members"."entitlement_lifecycle_messages_sent" ADD CONSTRAINT "entitlement_lifecycle_messages_sent_entitlement_id_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "members"."entitlements"("id") ON DELETE cascade ON UPDATE no action;