ALTER TABLE "members"."creation_inventory_floors" ADD COLUMN "palette_generation" uuid;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "pending_palette_write" jsonb;--> statement-breakpoint
ALTER TABLE "members"."creations" ADD COLUMN "palette_write_receipt" jsonb;