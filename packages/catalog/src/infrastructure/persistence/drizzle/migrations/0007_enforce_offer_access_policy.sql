ALTER TABLE "catalog"."offers" ALTER COLUMN "access_mode" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."offers" ADD CONSTRAINT "offers_access_pricing_mode_ck" CHECK ((
        ("catalog"."offers"."pricing_mode" = 'one_time' AND "catalog"."offers"."access_mode" IN ('lifetime', 'fixed'))
        OR ("catalog"."offers"."pricing_mode" = 'subscription' AND "catalog"."offers"."access_mode" = 'billing_cycle')
      ));--> statement-breakpoint
ALTER TABLE "catalog"."offers" ADD CONSTRAINT "offers_access_duration_ck" CHECK ((
        "catalog"."offers"."access_mode" = 'fixed'
        AND (
          ("catalog"."offers"."access_duration_value" IS NULL AND "catalog"."offers"."access_duration_unit" IS NULL AND "catalog"."offers"."status" <> 'active')
          OR ("catalog"."offers"."access_duration_value" > 0 AND "catalog"."offers"."access_duration_unit" IS NOT NULL)
        )
      ) OR (
        "catalog"."offers"."access_mode" <> 'fixed'
        AND "catalog"."offers"."access_duration_value" IS NULL
        AND "catalog"."offers"."access_duration_unit" IS NULL
      ));