CREATE INDEX "otp_codes_expires_idx" ON "auth"."otp_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_idx" ON "auth"."password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_idx" ON "auth"."refresh_tokens" USING btree ("expires_at");