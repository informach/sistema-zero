DROP INDEX "payments"."payments_txid_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "payments_txid_uq" ON "payments"."payments" USING btree ("txid") WHERE txid IS NOT NULL;