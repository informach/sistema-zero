DROP INDEX "messaging"."messages_dispatch_idx";--> statement-breakpoint
CREATE INDEX "messages_claim_idx" ON "messaging"."messages" USING btree ("channel","status","priority" DESC NULLS LAST,"scheduled_at");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messaging"."messages" USING btree ("created_at");