ALTER TABLE "funil"."leads" ADD COLUMN "attribution" jsonb;
ALTER TABLE "funil"."funnel_events" ADD COLUMN "event_key" text;
CREATE UNIQUE INDEX "funnel_events_event_key_unique" ON "funil"."funnel_events" USING btree ("event_key");
