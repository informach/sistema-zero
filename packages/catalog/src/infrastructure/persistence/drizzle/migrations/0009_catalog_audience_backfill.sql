-- Explicit classification of the catalogue, re-audited in staging and production on 26/10/2026.
-- No title/prefix guesses, price/version updates or changes to purchase snapshots.
WITH classification(sku, audience) AS (VALUES
  ('estudio-completo', 'kids'),
  ('pinta', 'kids'),
  ('molda', 'kids'),
  ('pensa', 'kids'),
  ('clube-dos-criadores', 'kids'),
  ('mural-dos-criadores', 'kids'),
  ('todos-os-cursos-kids', 'kids'),
  ('comunidade-dos-criadores', 'kids'),
  ('desafio-primeiro-jogo', 'kids'),
  -- Archived staging predecessor: identical child/family course description, reviewed 26/10.
  ('desafio-do-primeiro-jogo', 'kids'),
  ('adult-estudio-completo', 'adult'),
  ('adult-pinta', 'adult'),
  ('adult-molda', 'adult'),
  ('adult-pensa', 'adult'),
  ('adult-clube-dos-criadores', 'adult'),
  ('adult-mural-dos-criadores', 'adult'),
  ('todos-os-cursos-adultos', 'adult'),
  ('comunidade-dos-criadores-adulto', 'adult'),
  ('desafio-primeiro-jogo-adulto', 'adult'),
  -- Archived product remains classified so its financial history stays coherent.
  ('no-comando-da-ia', 'adult')
)
UPDATE "catalog"."products" p
SET "audience" = c.audience::"catalog"."catalog_audience"
FROM classification c WHERE p.sku = c.sku AND p.audience IS NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "catalog"."products" WHERE audience IS NULL) THEN
    RAISE EXCEPTION 'Unclassified catalog products: review their canonical community before migrating';
  END IF;
END $$;
--> statement-breakpoint
-- Accept only explicit metadata or a scope whose offers all have the same audience.
-- A previously global coupon without a declared community is deliberately ambiguous.
UPDATE "catalog"."coupons" SET audience = (metadata->>'audience')::"catalog"."catalog_audience"
WHERE audience IS NULL AND metadata->>'audience' IN ('kids', 'adult');
--> statement-breakpoint
WITH scoped AS (
  SELECT co.coupon_id, min(p.audience::text) AS audience
  FROM "catalog"."coupon_offers" co
  JOIN "catalog"."offers" o ON o.id = co.offer_id
  JOIN "catalog"."products" p ON p.id = o.product_id
  GROUP BY co.coupon_id HAVING count(DISTINCT p.audience) = 1
)
UPDATE "catalog"."coupons" c SET audience = s.audience::"catalog"."catalog_audience"
FROM scoped s WHERE c.id = s.coupon_id AND NOT c.applies_to_all AND c.audience IS NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "catalog"."coupons" WHERE audience IS NULL) THEN
    RAISE EXCEPTION 'Unclassified catalog coupons: explicitly review their community before migrating';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "catalog"."product_components" pc
    JOIN "catalog"."products" parent ON parent.id = pc.product_id
    JOIN "catalog"."products" child ON child.id = pc.component_product_id
    WHERE parent.audience <> child.audience
  ) OR EXISTS (
    SELECT 1 FROM "catalog"."offer_items" oi
    JOIN "catalog"."offers" o ON o.id = oi.offer_id
    JOIN "catalog"."products" parent ON parent.id = o.product_id
    JOIN "catalog"."products" bonus ON bonus.id = oi.product_id
    WHERE parent.audience <> bonus.audience
  ) OR EXISTS (
    SELECT 1 FROM "catalog"."coupon_offers" co
    JOIN "catalog"."coupons" c ON c.id = co.coupon_id
    JOIN "catalog"."offers" o ON o.id = co.offer_id
    JOIN "catalog"."products" p ON p.id = o.product_id
    WHERE c.audience <> p.audience
  ) THEN
    RAISE EXCEPTION 'Cross-community catalog references: review them before migrating';
  END IF;
END $$;
