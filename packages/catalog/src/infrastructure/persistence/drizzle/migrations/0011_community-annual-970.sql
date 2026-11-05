-- New sales only: preserve transactions, subscriptions and custom Admin prices.
UPDATE "catalog"."offers"
SET "price_cents" = 97000,
    "compare_at_price_cents" = CASE
      WHEN "compare_at_price_cents" < 97000 THEN NULL
      ELSE "compare_at_price_cents"
    END,
    "version" = "version" + 1,
    "updated_at" = now()
WHERE "slug" IN ('comunidade-dos-criadores-anual', 'comunidade-dos-criadores-adulto-anual')
  AND "currency" = 'BRL'
  AND "billing_interval_months" = 12
  AND "price_cents" = 79700;
