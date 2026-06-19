import { Elysia } from 'elysia'
import type { HandleBoletoNotificationService } from '../../../application/handle-boleto-notification/handle-boleto-notification.service'
import type {
  HandleProviderWebhookService,
  PixWebhookItem,
} from '../../../application/handle-provider-webhook/handle-provider-webhook.service'
import type { Logger } from '../../../infrastructure/logging/logger'
import type { RateLimiter } from '../../../infrastructure/security/rate-limiter'
import { PayloadTooLargeError, TooManyRequestsError } from '../errors'
import { isOversizeBody } from '../raw-body'
import { safeEqual } from '../safe-equal'

export interface WebhooksRoutesDeps {
  handleWebhook: HandleProviderWebhookService
  handleBoletoNotification: HandleBoletoNotificationService
  logger: Logger
  /**
   * Segredo compartilhado opcional em dev; em produção o boot o EXIGE (refine no
   * env). A Efí deve incluí-lo no registro do webhook (`?token=<segredo>` ou
   * header `x-webhook-token`); sem ele a requisição é recusada (401). Quando
   * ausente, a proteção é só a re-consulta na Efí (comportamento legado, só dev).
   */
  webhookSecret?: string
  /**
   * Teto GLOBAL de backpressure (chave única, não por IP — o XFF do webhook não é
   * confiável p/ punir por IP). Cada item de webhook custa 1 INSERT + 1 chamada à
   * Efí; sem teto, payloads forjados em volume esgotam pool/budget da Efí. Um 429
   * não perde pagamento: a Efí re-tenta e a reconciliação é a rede de segurança.
   */
  rateLimiter: RateLimiter
}

/** Chave única do rate limit global dos webhooks (limite agregado da rota). */
const WEBHOOK_RATE_KEY = 'efi-webhook'

/**
 * Webhook do Pix (Efí). A autenticidade vem do mTLS na borda, da **re-consulta da
 * cobrança na Efí** dentro do caso de uso e, opcionalmente, de um segredo
 * compartilhado (`EFI_WEBHOOK_SECRET`). Sempre responde 200 quando autorizado
 * (inclusive para a notificação de teste enviada pela Efí ao configurar o webhook).
 */
export function webhooksRoutes(deps: WebhooksRoutesDeps) {
  const checkSecret = (query: unknown, headers: Record<string, string | undefined>): boolean => {
    if (!deps.webhookSecret) return true
    const token = (query as Record<string, string | undefined>).token ?? headers['x-webhook-token']
    return !!token && safeEqual(token, deps.webhookSecret)
  }

  const checkRateLimit = async () => {
    const limit = await deps.rateLimiter.check(WEBHOOK_RATE_KEY)
    if (!limit.allowed) throw new TooManyRequestsError(limit.retryAfterSeconds)
  }

  return (
    new Elysia({ prefix: '/webhooks' })
      .post('/efi/pix', async ({ body, set, query, headers, request }) => {
        await checkRateLimit()
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        if (!checkSecret(query, headers)) {
          deps.logger.warn('webhook.unauthorized')
          set.status = 401
          return { error: { code: 'UNAUTHORIZED', message: 'Token de webhook inválido' } }
        }

        const items = extractPixItems(body)
        if (items.length > 0) {
          await deps.handleWebhook.execute({ items })
        } else {
          deps.logger.info('webhook.empty_or_test_notification')
        }
        set.status = 200
        return { received: true }
      })
      // Notificação de boleto (API Cobranças): a Efí POSTa apenas um TOKEN, que o
      // caso de uso resolve na fonte. O token forjado não resolve nada real, então
      // a re-consulta na Efí é a âncora de confiança (como no Pix). Aceita o token
      // por JSON `{notification}`, form-urlencoded `notification=<t>` ou `?token=`.
      .post('/efi/cobrancas', async ({ body, set, query, headers, request }) => {
        await checkRateLimit()
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        if (!checkSecret(query, headers)) {
          deps.logger.warn('webhook.unauthorized')
          set.status = 401
          return { error: { code: 'UNAUTHORIZED', message: 'Token de webhook inválido' } }
        }

        const token = extractNotificationToken(body, query)
        if (token) {
          await deps.handleBoletoNotification.execute({ token })
        } else {
          deps.logger.info('webhook.empty_or_test_notification')
        }
        set.status = 200
        return { received: true }
      })
  )
}

/** Extrai os itens de Pix recebido do payload da Efí: `{ pix: [{ txid, endToEndId }] }`. */
function extractPixItems(body: unknown): PixWebhookItem[] {
  if (!body || typeof body !== 'object') return []
  const pix = (body as { pix?: unknown }).pix
  if (!Array.isArray(pix)) return []

  const items: PixWebhookItem[] = []
  for (const entry of pix) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as { txid?: unknown }).txid === 'string'
    ) {
      const e = entry as { txid: string; endToEndId?: string; e2eId?: string }
      items.push({ txid: e.txid, endToEndId: e.endToEndId ?? e.e2eId })
    }
  }
  return items
}

/**
 * Extrai o token de notificação da Efí (Cobranças). A Efí costuma POSTar
 * `notification=<token>` (form-urlencoded → o parser do Elysia entrega
 * `{ notification }`); toleramos também JSON, string crua e `?notification=`.
 */
function extractNotificationToken(body: unknown, query: unknown): string | undefined {
  if (body && typeof body === 'object') {
    const n = (body as { notification?: unknown }).notification
    if (typeof n === 'string' && n.length > 0) return n
  }
  if (typeof body === 'string' && body.length > 0) {
    const n = new URLSearchParams(body).get('notification')
    if (n) return n
  }
  const q = (query as Record<string, string | undefined> | undefined)?.notification
  return q || undefined
}
