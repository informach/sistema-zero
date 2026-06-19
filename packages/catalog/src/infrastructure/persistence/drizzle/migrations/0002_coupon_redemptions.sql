CREATE TABLE "catalog"."coupon_redemptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"coupon_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "catalog"."coupons"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_uq" ON "catalog"."coupon_redemptions" USING btree ("coupon_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_idx" ON "catalog"."coupon_redemptions" USING btree ("coupon_id");