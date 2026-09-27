UPDATE "catalog"."offers"
SET "access_mode" = CASE
	WHEN "pricing_mode" = 'subscription' THEN 'billing_cycle'::"catalog"."access_mode"
	ELSE 'lifetime'::"catalog"."access_mode"
END
WHERE "access_mode" IS NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "catalog"."offers"
		WHERE "access_mode" IS NULL
	) THEN
		RAISE EXCEPTION 'catalog.offers access_mode backfill left null rows';
	END IF;
END $$;
