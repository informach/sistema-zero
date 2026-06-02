import { PayloadTooLargeError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { GrantEntitlementService } from '../../../application/grant-entitlement/grant-entitlement.service'
import type { RevokeEntitlementService } from '../../../application/revoke-entitlement/revoke-entitlement.service'
import type { ProcessedWebhookRepository } from '../../../domain/ports/processed-webhook-repository.port'
import { GrantWebhookBody, SubscriptionWebhookBody } from '../dtos'
import { getRawBody, isOversizeBody } from '../raw-body'
import { assertWebhookSignature } from '../webhook-auth'

export interface WebhooksRoutesDeps {
  grant: GrantEntitlementService
  revoke: RevokeEntitlementService
  processed: ProcessedWebhookRepository
  webhookSecret: string
  toleranceSeconds: number
  now: () => Date
  logger: Logger
}

/**
 * Webhooks de entrada (funil → gateway → members). HMAC verificado sobre o corpo
 * bruto + dedupe por `x-delivery-id` (entrega ≥1 vez): checa ANTES, registra só
 * DEPOIS do sucesso → falha transitória continua retryável.
 */
export function webhooksRoutes(deps: WebhooksRoutesDeps) {
  const verify = (request: Request, headers: Record<string, string | undefined>) => {
    if (isOversizeBody(request)) throw new PayloadTooLargeError()
    assertWebhookSignature({
      secret: deps.webhookSecret,
      rawBody: getRawBody(request),
      signatureHeader: headers['x-signature'],
      toleranceSeconds: deps.toleranceSeconds,
    })
  }

  return new Elysia({ prefix: '/members/webhooks' })
    .post(
      '/grant',
      async ({ request, headers, body }) => {
        verify(request, headers)
        const deliveryId = headers['x-delivery-id'] ?? null
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }

        const parsedPaidAt = body.paidAt ? new Date(body.paidAt) : null
        const grantedAt =
          parsedPaidAt && !Number.isNaN(parsedPaidAt.getTime()) ? parsedPaidAt : deps.now()

        const result = await deps.grant.execute({
          userId: body.userId,
          offerRef: body.offerRef,
          paymentId: body.paymentId,
          grantedAt,
          subscription: body.subscription ?? null,
        })

        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'grant')
        return { ok: true, granted: result.granted }
      },
      { body: GrantWebhookBody },
    )
    .post(
      '/subscription',
      async ({ request, headers, body }) => {
        verify(request, headers)
        const deliveryId = headers['x-delivery-id'] ?? null
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }

        const result =
          body.event === 'canceled'
            ? await deps.revoke.cancel(body.subscriptionId)
            : await deps.revoke.expire(body.subscriptionId)

        if (deliveryId) await deps.processed.markProcessed(deliveryId, `subscription.${body.event}`)
        return { ok: true, affected: result.affected }
      },
      { body: SubscriptionWebhookBody },
    )
}
