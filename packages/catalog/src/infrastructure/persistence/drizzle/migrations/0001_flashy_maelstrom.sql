CREATE TYPE "catalog"."coupon_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "catalog"."coupon_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "catalog"."coupon_offers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"coupon_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."coupons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"code" text NOT NULL,
	"type" "catalog"."coupon_type" NOT NULL,
	"percent_off" integer,
	"amount_off_cents" integer,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"status" "catalog"."coupon_status" DEFAULT 'active' NOT NULL,
	"applies_to_all" boolean DEFAULT false NOT NULL,
	"min_purchase_cents" integer,
	"max_redemptions" integer,
	"times_redeemed" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog"."coupon_offers" ADD CONSTRAINT "coupon_offers_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "catalog"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."coupon_offers" ADD CONSTRAINT "coupon_offers_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "catalog"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_offers_uq" ON "catalog"."coupon_offers" USING btree ("coupon_id","offer_id");--> statement-breakpoint
CREATE INDEX "coupon_offers_coupon_idx" ON "catalog"."coupon_offers" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_uq" ON "catalog"."coupons" USING btree ("code");