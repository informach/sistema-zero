import { envelope, ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { safeEqual, verifyHmacSignature } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import type { HandlePaymentWebhookService } from '../../application/handle-payment-webhook/handle-payment-webhook.service'
import type { CatalogClient, PaymentsClient } from '../../domain/ports/clients.port'
import type { InvoiceRepository } from '../../domain/ports/invoice-repository.port'
import type { ProcessedWebhookStore } from '../../domain/ports/processed-webhook.port'
import { applyStatusStamp, stampForStatus } from '../../infrastructure/danfse/status-stamp'
import { adminRoutes } from './admin.routes'

export interface HttpDeps {
  logger: Logger
  handleWebhook: HandlePaymentWebhookService
  processedWebhooks: ProcessedWebhookStore
  invoices: InvoiceRepository
  /** Emissão manual por pagamento (rotas admin). */
  payments: PaymentsClient
  catalog: CatalogClient
  ambiente: string
  serviceDescPrefix: string
  /** Secret HMAC do consumer `fiscal` no payments. Vazio em dev = verificação desligada. */
  webhookHmacSecret?: string
  webhookToleranceSeconds: number
  /** Lease do processamento: inclui todas as chamadas S2S possíveis da entrega. */
  webhookProcessingStaleMs: number
  /** Guard das rotas admin (X-Auth-User-* + x-internal-token). */
  requireAdminEnabled?: boolean
  internalToken?: string
  /** Token do `/metrics` (header `x-metrics-token`/Bearer; obrigatório em prod). */
  metricsToken?: string
  /** Teto de corpo no nível do Bun.serve (413 automático). */
  maxRequestBodyBytes?: number
  /** Probe de readiness (select 1). */
  readiness: () => Promise<void>
}

const MAX_DELIVERY_ID = 200
/**
 * Borda HTTP do fiscal. O webhook do payments chega DIRETO (private networking,
 * sem gateway): auth = HMAC do corpo (`x-signature: t=,v1=` — contrato público
 * dos webhooks de saída do payments) + dedupe por `x-delivery-id` no padrão do
 * funil (checa ANTES, marca SÓ após sucesso — 502 re-entrega). Rotas
 * `/fiscal/admin/*` chegam via gateway (JWT/RBAC lá; defesa em profundidade aqui).
 */
export function createServer(deps: HttpDeps) {
  return (
    new Elysia({
      // Teto de corpo no nível do Bun.serve (rejeita no socket antes de bufferizar).
      serve: { maxRequestBodySize: deps.maxRequestBodyBytes ?? 64 * 1024 },
    })
      .onError(({ error, set, code }) => {
        if (error instanceof UnauthorizedError) {
          set.status = 401
          return envelope('UNAUTHORIZED', error.message)
        }
        if (error instanceof ForbiddenError) {
          set.status = 403
          return envelope('FORBIDDEN', error.message)
        }
        if (code === 'VALIDATION') {
          // Envelope FIXO: nunca ecoar o input recebido (o corpo padrão de erro do
          // Elysia inclui `found`) nem vazar a forma do schema a um chamador inválido.
          set.status = 400
          return envelope('VALIDATION_ERROR', 'Requisição inválida')
        }
        if (set.status === 200 || set.status === undefined) set.status = 500
        if (set.status === 500) {
          deps.logger.error('unhandled.error', { error: serializeError(error) })
          return envelope('INTERNAL_ERROR', 'Erro interno')
        }
        return undefined
      })
      .use(
        adminRoutes({
          invoices: deps.invoices,
          payments: deps.payments,
          catalog: deps.catalog,
          ambiente: deps.ambiente,
          serviceDescPrefix: deps.serviceDescPrefix,
          requireAdminEnabled: deps.requireAdminEnabled ?? true,
          internalToken: deps.internalToken,
          logger: deps.logger,
        }),
      )
      .get('/healthz', () => ({ status: 'ok' }))
      .get('/readyz', async ({ set }) => {
        try {
          await deps.readiness()
          return { status: 'ready' }
        } catch {
          set.status = 503
          return { status: 'unavailable' }
        }
      })
      // Contagem por status p/ monitoramento (alerte em FAILED/CANCEL_PENDING > 0).
      // Exige token quando definido (prod EXIGE — refine no env): defesa em
      // profundidade, mesmo na rede privada. Header `x-metrics-token` ou Bearer.
      .get('/metrics', async ({ headers, set }) => {
        if (deps.metricsToken) {
          const auth = headers.authorization
          const bearer = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined
          const provided = headers['x-metrics-token'] ?? bearer
          if (!provided || !safeEqual(provided, deps.metricsToken)) {
            set.status = 401
            return envelope('UNAUTHORIZED', 'Token de métricas inválido')
          }
        }
        return { byStatus: await deps.invoices.countByStatus() }
      })
      .post(
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
              deps.logger.warn('fiscal.webhook_signature_invalid', { reason: result.reason })
              set.status = 401
              return { error: 'assinatura inválida' }
            }
          }

          let parsed: { id?: unknown; event?: unknown; data?: unknown }
          try {
            parsed = JSON.parse(raw) as { id?: unknown; event?: unknown; data?: unknown }
          } catch {
            set.status = 400
            return { error: 'corpo não é JSON' }
          }
          // Dedupe pelo ID do corpo ASSINADO (o payments envia `{id,event,data}` e a
          // HMAC cobre o corpo). O header `x-delivery-id` é o MESMO valor mas NÃO
          // assinado — um replay trocando só o header forjaria um id novo e burlaria
          // o dedupe. Usamos o id do corpo; o header serve de fallback (dev sem HMAC).
          const headerDeliveryId = (headers['x-delivery-id'] ?? '').slice(0, MAX_DELIVERY_ID)
          const bodyDeliveryId =
            typeof parsed.id === 'string' ? parsed.id.slice(0, MAX_DELIVERY_ID) : ''
          const deliveryId = bodyDeliveryId || headerDeliveryId
          if (!deliveryId) {
            set.status = 400
            return { error: 'id de entrega ausente' }
          }
          if (bodyDeliveryId && headerDeliveryId && bodyDeliveryId !== headerDeliveryId) {
            deps.logger.warn('fiscal.webhook_delivery_id_mismatch', {
              bodyDeliveryId,
              headerDeliveryId,
            })
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

            const result = await deps.handleWebhook.execute({ deliveryId, eventName, payload })
            if (result.kind === 'retryable') {
              // NÃO marca processado — o payments re-entrega com backoff.
              await deps.processedWebhooks.releaseClaim(deliveryId, claim.token)
              deps.logger.warn('fiscal.webhook_retryable', {
                deliveryId,
                reason: result.reason,
              })
              set.status = 502
              return { error: result.reason }
            }
            const marked = await deps.processedWebhooks.markProcessed(deliveryId, claim.token, {
              paymentId: typeof payload.paymentId === 'string' ? payload.paymentId : undefined,
              eventName,
            })
            if (!marked) {
              // O lease foi reassumido antes da confirmação. Não confirmar uma
              // entrega sem dedupe durável: 502 força a reentrega at-least-once.
              deps.logger.warn('fiscal.webhook_confirmation_lost', { deliveryId })
              set.status = 502
              return { error: 'confirmação da entrega perdida' }
            }
            return { ok: true }
          } catch (error) {
            if (claim?.kind === 'claimed') {
              await deps.processedWebhooks.releaseClaim(deliveryId, claim.token).catch(() => {})
            }
            deps.logger.error('fiscal.webhook_failed', { deliveryId, error: serializeError(error) })
            set.status = 502
            return { error: 'falha ao processar' }
          }
        },
        // Corpo CRU (texto): a assinatura HMAC cobre o texto exato.
        { parse: 'text' },
      )
      .get('/fiscal/files/:token', async ({ params, set }) => {
        // Capability-URL p/ o messaging anexar o DANFSe (token aleatório de 32
        // bytes por nota; rota fora do gateway, rede privada).
        const token = params.token.replace(/\.pdf$/i, '')
        if (!/^[0-9a-f]{64}$/i.test(token)) {
          set.status = 404
          return { error: 'não encontrado' }
        }
        const pdf = await deps.invoices.findPdfByToken(token)
        if (!pdf) {
          set.status = 404
          return { error: 'não encontrado' }
        }
        // Nota CANCELLED/SUBSTITUTED: a marca d'água da NT 008 entra NA HORA de
        // servir (o bytea da emissão é imutável). A marca é obrigatória: se o
        // carimbo falhar, a rota falha fechada em vez de servir status incorreto.
        const stamp = stampForStatus(pdf.invoiceStatus)
        const content = stamp ? await applyStatusStamp(pdf.content, stamp) : pdf.content
        return new Response(Buffer.from(content), {
          headers: {
            // content-type fixado na borda; nosniff + no-store: a URL é mailada ao
            // comprador e buscada pelo messaging — documento fiscal com PII não deve
            // ser sniffado nem cacheado por intermediários.
            'content-type': 'application/pdf',
            'content-disposition': 'attachment; filename="nota-fiscal.pdf"',
            'x-content-type-options': 'nosniff',
            'cache-control': 'private, no-store',
          },
        })
      })
  )
}
