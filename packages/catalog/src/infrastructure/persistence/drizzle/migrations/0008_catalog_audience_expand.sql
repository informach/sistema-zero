CREATE TYPE "catalog"."catalog_audience" AS ENUM('kids', 'adult');--> statement-breakpoint
ALTER TABLE "catalog"."coupons" ADD COLUMN "audience" "catalog"."catalog_audience";--> statement-breakpoint
ALTER TABLE "catalog"."products" ADD COLUMN "audience" "catalog"."catalog_audience";--> statement-breakpoint
CREATE INDEX "coupons_audience_created_idx" ON "catalog"."coupons" USING btree ("audience","created_at");--> statement-breakpoint
CREATE INDEX "products_audience_created_idx" ON "catalog"."products" USING btree ("audience","created_at");