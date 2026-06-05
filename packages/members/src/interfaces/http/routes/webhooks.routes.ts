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
  // HMAC verificado no `transform` (roda ANTES da validação do corpo) → uma
  // requisição sem assinatura válida nunca chega à validação/handler (401 antes
  // de 422; nada de side-effect antes da autenticação). 413 tem precedência.
  const verify = ({
    request,
    headers,
  }: {
    request: Request
    headers: Record<string, string | undefined>
  }) => {
    if (isOversizeBody(request)) throw new PayloadTooLargeError()
    assertWebhookSignature({
      secret: deps.webhookSecret,
      method: request.method,
      path: new URL(request.url).pathname,
      rawBody: getRawBody(request),
      signatureHeader: headers['x-signature'],
      toleranceSeconds: deps.toleranceSeconds,
    })
  }

  return new Elysia({ prefix: '/members/webhooks' })
    .onTransform(verify)
    .post(
      '/grant',
      async ({ headers, body, set }) => {
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

        // Oferta não resolvida no catálogo (404) → 502 SEM marcar a entrega: o
        // gateway/funil re-entrega (auto-cura uma corrida; uma divergência de slug
        // permanente aflora como falhas repetidas em vez de sumir silenciosamente).
        if (!result.offerFound) {
          deps.logger.warn('grant.offer_unresolved', { offerRef: body.offerRef })
          set.status = 502
          return { ok: false, error: 'OFFER_UNRESOLVED' }
        }

        // Oferta resolvida mas SEM nenhum item (drift de contrato — itens
        // malformados são descartados no parse do gateway do catálogo): marcar a
        // entrega aqui deixaria o comprador sem acesso em silêncio. 502 → re-entrega
        // (a falha repetida é o alarme).
        if (result.itemsResolved === 0) {
          deps.logger.error('grant.offer_empty', { offerRef: body.offerRef })
          set.status = 502
          return { ok: false, error: 'OFFER_EMPTY' }
        }

        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'grant')
        return { ok: true, granted: result.granted }
      },
      { body: GrantWebhookBody },
    )
    .post(
      '/subscription',
      async ({ headers, body }) => {
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
