import { t } from 'elysia'

/**
 * Corpo de `POST /members/webhooks/grant` — concessão de acesso (funil → gateway →
 * members). `subscription` presente = acesso por assinatura; ausente = compra única.
 */
export const GrantWebhookBody = t.Object({
  userId: t.String({ minLength: 1, maxLength: 64 }),
  offerRef: t.String({ minLength: 1, maxLength: 200 }),
  paymentId: t.String({ minLength: 1, maxLength: 100 }),
  paidAt: t.Optional(t.String({ maxLength: 40 })),
  subscription: t.Optional(
    t.Object({
      subscriptionId: t.String({ minLength: 1, maxLength: 100 }),
      intervalMonths: t.Union([t.Integer({ minimum: 1, maximum: 120 }), t.Null()]),
    }),
  ),
})

/** Corpo de `POST /members/webhooks/subscription` — ciclo de vida da assinatura. */
export const SubscriptionWebhookBody = t.Object({
  event: t.Union([t.Literal('canceled'), t.Literal('expired')]),
  subscriptionId: t.String({ minLength: 1, maxLength: 100 }),
})
