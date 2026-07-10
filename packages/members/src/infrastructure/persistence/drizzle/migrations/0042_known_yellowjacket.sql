CREATE TABLE "members"."renewal_reminders_sent" (
	"entitlement_id" uuid NOT NULL,
	"expires_on" date NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "renewal_reminders_sent_pk" PRIMARY KEY("entitlement_id","expires_on")
);
