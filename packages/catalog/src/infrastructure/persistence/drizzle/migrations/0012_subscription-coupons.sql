-- Enable the new first-charge coupon flow for canonical subscription offers only.
-- Preserve explicit Admin choices, other content, prices and existing purchases.
UPDATE "catalog"."offers"
SET "content" = COALESCE("content", '{}'::jsonb) || '{"allowsCoupon":true}'::jsonb,
    "version" = "version" + 1,
    "updated_at" = now()
WHERE "slug" IN (
  'comunidade-dos-criadores-mensal', 'comunidade-dos-criadores-anual',
  'comunidade-dos-criadores-adulto-mensal', 'comunidade-dos-criadores-adulto-anual'
)
  AND "pricing_mode" = 'subscription'
  AND "currency" = 'BRL'
  AND "billing_interval_months" IN (1, 12)
  AND NOT (COALESCE("content", '{}'::jsonb) ? 'allowsCoupon');
