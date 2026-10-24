# Billing audience provenance

New checkout metadata records `billingAudience`, `billingAudienceSource: funnel-registry-v1` and the canonical `billingFunnelKey` only when the stored lead's origin resolves in the server's real funnel registry. Registry `kids` maps to Kids communications and `pro` maps to adult communications; this `pro` is the adult funnel audience, not an Estúdio Pro entitlement.

The request body cannot choose this metadata. Missing or unknown legacy origins remain unclassified; neither the default adult funnel, product label, SKU prefix nor a browser-supplied audience substitutes for evidence. Existing purchases are not rewritten, notified or canceled by this change. Recovery admission must place unclassified eligible renewals into operational review.

Causal local checkout tests: two registered-audience failures before implementation, then 59 pass / 243 assertions across subscription and checkout integration suites, including unknown, missing and forged browser audience. Full Funnel suite: 596 pass, 2 optional PostgreSQL tests skipped, no failures. Astro typecheck over 336 files exited zero with no errors (three informational hints); Node heap limited to 1 GiB, serial execution. This is metadata classification, not native provider qualification or recovery activation.
