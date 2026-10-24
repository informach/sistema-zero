-- Bootstrap permanent identities from recorded financial facts. Do not rewrite
-- counters, subscription states, money, access periods or historical events.
INSERT INTO payments.subscription_paid_cycles (subscription_id, provider_payment_id)
SELECT s.id, s.last_charge_id
FROM payments.subscriptions s
WHERE s.cycles_completed > 0 AND length(s.last_charge_id) BETWEEN 1 AND 200
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO payments.subscription_paid_cycles (subscription_id, provider_payment_id)
SELECT s.id, p.provider_payment_id
FROM payments.payments p
JOIN payments.subscriptions s ON s.id = p.subscription_id
  AND s.consumer_id = p.consumer_id AND s.provider = p.provider
WHERE p.status = 'PAID' AND p.method = 'CREDIT_CARD'
  AND p.currency = s.currency AND p.amount_in_cents = s.amount_in_cents
  AND length(p.provider_payment_id) BETWEEN 1 AND 200
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO payments.subscription_paid_cycles (subscription_id, provider_payment_id)
SELECT s.id, o.payload->>'chargeId'
FROM payments.outbox o
JOIN payments.subscriptions s ON s.id::text = o.aggregate_id
WHERE o.event_name = 'subscription.charge_paid'
  AND o.payload->>'consumerId' = s.consumer_id
  AND length(o.payload->>'chargeId') BETWEEN 1 AND 200
ON CONFLICT DO NOTHING;
