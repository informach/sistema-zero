import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { verifyHmacSignature } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import type {
  HandleResult,
  RecordConversionService,
} from '../../application/conversions/record-conversion.service'
import type { ProcessedWebhookStore } from '../../domain/ports/processed-webhook.port'

export interface WebhooksRoutesDeps {
  logger: Logger
  handle: Pick<RecordConversionService, 'execute'>
  processedWebhooks: ProcessedWebhookStore
  /** Secret HMAC do consumer `referrals` no payments. Vazio em dev = verificação off. */
  webhookHmacSecret?: string
  /** Em produção a assinatura é OBRIGATÓRIA: sem secret a rota falha fechada. */
  requireSignature: boolean
  webhookToleranceSeconds: number
  /** Lease do processamento (cobre as S2S payments+catalog da entrega). */
  webhookProcessingStaleMs: number
}

const MAX_DELIVERY_ID = 200

/**
 * Consumer do payments (webhook DIRETO na rede privada, sem gateway — mesmo
 * desenho do fiscal): HMAC do corpo cru + dedupe pelo id ASSINADO do corpo
 * (claim/lease; checa antes, marca só após sucesso — 502 re-entrega).
 */
export function webhooksRoutes(deps: WebhooksRoutesDeps) {
  return new Elysia().post(
    '/webhooks/payments',
    async ({ body, headers, set }) => {
      const raw = typeof body === 'string' ? body : ''

      if (deps.webhookHmacSecret) {
        const result = verifyHmacSignature({
          secret: deps.webhookHmacSecret,
          body: raw,
          signatureHeader: headers['x-signature'],
          nowSeconds: Math.floor(Date.now() / 1000),
          toleranceSeconds: deps.webhookToleranceSeconds,
        })
        if (!result.valid) {
          deps.logger.warn('referrals.webhook_signature_invalid', { reason: result.reason })
          set.status = 401
          return { error: 'assinatura inválida' }
        }
      } else if (deps.requireSignature) {
        // Produção sem secret configurado: falha FECHADA (nunca aceitar sem HMAC).
        deps.logger.error('referrals.webhook_secret_missing', {})
        set.status = 401
        return { error: 'verificação de assinatura indisponível' }
      }

      let parsed: { id?: unknown; event?: unknown; data?: unknown }
      try {
        parsed = JSON.parse(raw) as { id?: unknown; event?: unknown; data?: unknown }
      } catch {
        set.status = 400
        return { error: 'corpo não é JSON' }
      }
      // Dedupe pelo ID do corpo ASSINADO (o header x-delivery-id não é assinado —
      // um replay trocando só o header forjaria id novo).
      // ⚠️ O header é fallback SÓ em dev/teste: em deploy, um corpo sem `id`
      // (contrato do payments mudou) tem de FALHAR alto, não cair em silêncio
      // num dedupe que o replay controla.
      const headerDeliveryId = deps.requireSignature
        ? ''
        : (headers['x-delivery-id'] ?? '').slice(0, MAX_DELIVERY_ID)
      const bodyDeliveryId =
        typeof parsed.id === 'string' ? parsed.id.slice(0, MAX_DELIVERY_ID) : ''
      const deliveryId = bodyDeliveryId || headerDeliveryId
      if (!deliveryId) {
        set.status = 400
        return { error: 'id de entrega ausente' }
      }
      const eventName = typeof parsed.event === 'string' ? parsed.event : ''
      const payload = (parsed.data ?? {}) as Record<string, unknown>

      let claim: Awaited<ReturnType<ProcessedWebhookStore['claimDelivery']>> | null = null
      try {
        claim = await deps.processedWebhooks.claimDelivery(
          deliveryId,
          deps.webhookProcessingStaleMs,
        )
        if (claim.kind === 'processed') return { ok: true, deduped: true }
        if (claim.kind === 'in_progress') {
          set.status = 502
          return { error: 'entrega já está em processamento' }
        }

        const result: HandleResult = await deps.handle.execute({ deliveryId, eventName, payload })
        if (result.kind === 'retryable') {
          await deps.processedWebhooks.releaseClaim(deliveryId, claim.token)
          // O motivo fica no LOG (com ids internos e topologia); a resposta
          // devolve envelope fixo, como o resto da borda.
          deps.logger.warn('referrals.webhook_retryable', { deliveryId, reason: result.reason })
          set.status = 502
          return { error: 'não foi possível processar agora' }
        }
        const marked = await deps.processedWebhooks.markProcessed(deliveryId, claim.token, {
          paymentId: typeof payload.paymentId === 'string' ? payload.paymentId : undefined,
          eventName,
        })
        if (!marked) {
          // Lease reassumido antes da confirmação: 502 força a re-entrega
          // at-least-once (o processamento é idempotente pelas uniques).
          deps.logger.warn('referrals.webhook_confirmation_lost', { deliveryId })
          set.status = 502
          return { error: 'confirmação da entrega perdida' }
        }
        return { ok: true }
      } catch (error) {
        if (claim?.kind === 'claimed') {
          await deps.processedWebhooks.releaseClaim(deliveryId, claim.token).catch(() => {})
        }
        deps.logger.error('referrals.webhook_failed', {
          deliveryId,
          error: serializeError(error),
        })
        set.status = 502
        return { error: 'falha ao processar' }
      }
    },
    // Corpo CRU (texto): a assinatura HMAC cobre o texto exato.
    { parse: 'text' },
  )
}
