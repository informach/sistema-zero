CREATE SCHEMA "funil";
--> statement-breakpoint
CREATE TABLE "funil"."funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"step" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funil"."leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text,
	"email" text,
	"telefone" text,
	"segmento" text,
	"gasto_terceiros" integer,
	"forma_de_criar" text,
	"ja_quebrou" text,
	"nivel_refem" integer,
	"horas_retrabalho" integer,
	"valor_hora" integer,
	"custo_mensal" integer,
	"peso_principal" text,
	"visualizacao" text,
	"o_que_falta" text,
	"mudanca_desejada" text,
	"last_step" text DEFAULT 'entrou_landing' NOT NULL,
	"payment_id" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funil"."processed_webhooks" (
	"delivery_id" text PRIMARY KEY NOT NULL,
	"payment_id" uuid,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funil"."funnel_events" ADD CONSTRAINT "funnel_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "funil"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funnel_events_lead_idx" ON "funil"."funnel_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "funnel_events_name_idx" ON "funil"."funnel_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "funil"."leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_segmento_idx" ON "funil"."leads" USING btree ("segmento");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "funil"."leads" USING btree ("created_at");