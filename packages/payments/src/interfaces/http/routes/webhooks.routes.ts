import { timingSafeEqual } from 'node:crypto'
import { Elysia } from 'elysia'
import type {
  HandleProviderWebhookService,
  PixWebhookItem,
} from '../../../application/handle-provider-webhook/handle-provider-webhook.service'
import type { Logger } from '../../../infrastructure/logging/logger'
import { PayloadTooLargeError } from '../errors'
import { isOversizeBody } from '../raw-body'

export interface WebhooksRoutesDeps {
  handleWebhook: HandleProviderWebhookService
  logger: Logger
  /**
   * Segredo compartilhado opcional. Quando definido, a Efí deve incluí-lo no
   * registro do webhook (`?token=<segredo>` ou header `x-webhook-token`); sem ele
   * a requisição é recusada (401). Quando ausente, a proteção é só o mTLS na borda
   * + a re-consulta na Efí (comportamento legado).
   */
  webhookSecret?: string
}

/** Comparação em tempo constante de strings (evita timing oracle no token). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Webhook do Pix (Efí). A autenticidade vem do mTLS na borda, da **re-consulta da
 * cobrança na Efí** dentro do caso de uso e, opcionalmente, de um segredo
 * compartilhado (`EFI_WEBHOOK_SECRET`). Sempre responde 200 quando autorizado
 * (inclusive para a notificação de teste enviada pela Efí ao configurar o webhook).
 */
export function webhooksRoutes(deps: WebhooksRoutesDeps) {
  return new Elysia({ prefix: '/webhooks' }).post('/efi/pix', async ({ body, set, query, headers, request }) => {
    if (isOversizeBody(request)) throw new PayloadTooLargeError()
    if (deps.webhookSecret) {
      const token = (query as Record<string, string | undefined>)['token'] ?? headers['x-webhook-token']
      if (!token || !safeEqual(token, deps.webhookSecret)) {
        deps.logger.warn('webhook.unauthorized')
        set.status = 401
        return { error: { code: 'UNAUTHORIZED', message: 'Token de webhook inválido' } }
      }
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
}

/** Extrai os itens de Pix recebido do payload da Efí: `{ pix: [{ txid, endToEndId }] }`. */
function extractPixItems(body: unknown): PixWebhookItem[] {
  if (!body || typeof body !== 'object') return []
  const pix = (body as { pix?: unknown }).pix
  if (!Array.isArray(pix)) return []

  const items: PixWebhookItem[] = []
  for (const entry of pix) {
    if (entry && typeof entry === 'object' && typeof (entry as { txid?: unknown }).txid === 'string') {
      const e = entry as { txid: string; endToEndId?: string; e2eId?: string }
      items.push({ txid: e.txid, endToEndId: e.endToEndId ?? e.e2eId })
    }
  }
  return items
}
