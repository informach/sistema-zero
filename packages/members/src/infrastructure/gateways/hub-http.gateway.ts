import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type { HubGateway } from '../../domain/ports/hub-gateway.port'

export interface HubHttpGatewayOptions {
  /** Base do hub (ex.: http://hub.railway.internal:3010). Sem `/hub`. */
  baseUrl: string
  /** Segredo HMAC compartilhado (= GATEWAY_HMAC_SECRET; o hub verifica com ele). */
  hmacSecret: string
  /** Timeout por chamada (ms). */
  timeoutMs?: number
  /** Injetável em testes (só a assinatura de chamada — sem `preconnect`); default = fetch global. */
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>
  /** Injetável em testes (clock do timestamp da assinatura). */
  now?: () => Date
  logger?: Logger
}

/**
 * Path EXATO que o hub assina/verifica — a mensagem canônica é
 * `<MÉTODO>.<path>.<corpo>`, então o path tem de bater com o `URL.pathname` que o
 * hub vê (chamada DIRETA, sem reescrita do gateway).
 */
const GRANT_PATH = '/hub/webhooks/grant'
const DEFAULT_TIMEOUT_MS = 4_000

/**
 * Adapter HTTP do hub (comunidade). Notifica `POST /hub/webhooks/grant` — chamada
 * S2S DIRETA na rede interna, assinada com HMAC (mesmo canônico
 * `<MÉTODO>.<path>.<corpo>` + `GATEWAY_HMAC_SECRET` que o hub VERIFICA) e com
 * `x-delivery-id` (uuid) p/ o dedupe de lá. **Best-effort**: qualquer erro/timeout é
 * só logado — a concessão/revogação NUNCA falha por causa do hub (o micro-cache de
 * acesso do hub expira sozinho no TTL como rede de segurança).
 */
export function createHubHttpGateway(opts: HubHttpGatewayOptions): HubGateway {
  const doFetch = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/$/, '')
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const now = opts.now ?? (() => new Date())

  return {
    async notifyAccessChanged(userId: string, event: string): Promise<void> {
      try {
        const rawBody = JSON.stringify({ userId, event })
        const ts = Math.floor(now().getTime() / 1000)
        const signature = signHmac(
          opts.hmacSecret,
          canonicalHmacMessage({ method: 'POST', path: GRANT_PATH, body: rawBody }),
          ts,
        )
        const res = await doFetch(`${base}${GRANT_PATH}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-signature': `t=${ts},v1=${signature}`,
            'x-delivery-id': randomUUID(),
          },
          body: rawBody,
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!res.ok) {
          opts.logger?.warn('hub.notify_failed', { userId, event, status: res.status })
        }
      } catch (error) {
        // Best-effort: log e segue. O TTL do hub cobre se a notificação não chegou.
        opts.logger?.warn('hub.notify_error', {
          userId,
          event,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  }
}

/** No-op (sem `HUB_BASE_URL` — dev/local ou hub não configurado): não notifica nada. */
export const noopHubGateway: HubGateway = {
  async notifyAccessChanged() {},
}
