CREATE SCHEMA "catalog";
--> statement-breakpoint
CREATE TYPE "catalog"."offer_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "catalog"."pricing_mode" AS ENUM('one_time', 'subscription');--> statement-breakpoint
CREATE TYPE "catalog"."product_kind" AS ENUM('ebook', 'course', 'template_kit', 'community', 'service', 'bundle', 'other');--> statement-breakpoint
CREATE TYPE "catalog"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "catalog"."offer_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"offer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."offers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"product_id" uuid NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "catalog"."offer_status" DEFAULT 'draft' NOT NULL,
	"price_cents" integer NOT NULL,
	"compare_at_price_cents" integer,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"pricing_mode" "catalog"."pricing_mode" DEFAULT 'one_time' NOT NULL,
	"installments_max" integer,
	"trial_days" integer,
	"guarantee_days" integer,
	"available_from" timestamp with time zone,
	"available_until" timestamp with time zone,
	"content" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_components" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"component_product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"sku" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "catalog"."product_kind" DEFAULT 'other' NOT NULL,
	"description" text,
	"status" "catalog"."product_status" DEFAULT 'draft' NOT NULL,
	"sellable" boolean DEFAULT true NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"fulfillment" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog"."offer_items" ADD CONSTRAINT "offer_items_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "catalog"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."offer_items" ADD CONSTRAINT "offer_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."offers" ADD CONSTRAINT "offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_components" ADD CONSTRAINT "product_components_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_components" ADD CONSTRAINT "product_components_component_product_id_products_id_fk" FOREIGN KEY ("component_product_id") REFERENCES "catalog"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "offer_items_uq" ON "catalog"."offer_items" USING btree ("offer_id","product_id");--> statement-breakpoint
CREATE INDEX "offer_items_offer_idx" ON "catalog"."offer_items" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_code_uq" ON "catalog"."offers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_slug_uq" ON "catalog"."offers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "offers_product_idx" ON "catalog"."offers" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_components_uq" ON "catalog"."product_components" USING btree ("product_id","component_product_id");--> statement-breakpoint
CREATE INDEX "product_components_product_idx" ON "catalog"."product_components" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_uq" ON "catalog"."products" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_uq" ON "catalog"."products" USING btree ("slug");