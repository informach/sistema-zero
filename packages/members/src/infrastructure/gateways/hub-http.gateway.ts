import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type {
  HubAuthorActivity,
  HubGateway,
  PlayCheckResult,
  PublicGameItem,
  ShowcaseByAuthorItem,
} from '../../domain/ports/hub-gateway.port'

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
 * `<MÉTODO>.<path>.delivery=<id>.<corpo>` quando há `x-delivery-id`, então o
 * path tem de bater com o `URL.pathname` que o hub vê (chamada DIRETA, sem
 * reescrita do gateway).
 */
const GRANT_PATH = '/hub/webhooks/grant'
const SHOWCASE_BY_AUTHORS_PATH = '/hub/internal/showcase-by-authors'
const SHOWCASE_BY_AUTHOR_PATH = '/hub/internal/showcase-by-author'
const ACTIVITY_BY_AUTHORS_PATH = '/hub/internal/activity-by-authors'
const PLAY_CHECK_PATH = '/hub/internal/play-check'
const DEFAULT_TIMEOUT_MS = 4_000

/**
 * Adapter HTTP do hub (comunidade). Notifica `POST /hub/webhooks/grant` — chamada
 * S2S DIRETA na rede interna, assinada com HMAC (mesmo canônico
 * `<MÉTODO>.<path>.delivery=<id>.<corpo>` + `GATEWAY_HMAC_SECRET` que o hub
 * VERIFICA) e com `x-delivery-id` (uuid) p/ o dedupe de lá. **Best-effort**:
 * qualquer erro/timeout é só logado — a concessão/revogação NUNCA falha por causa
 * do hub (o micro-cache de acesso do hub expira sozinho no TTL como rede de
 * segurança).
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
        // O mesmo id é enviado E autenticado: o hub o usa para dedupe e rejeita
        // uma assinatura que não o inclua na mensagem canônica.
        const deliveryId = randomUUID()
        const ts = Math.floor(now().getTime() / 1000)
        const signature = signHmac(
          opts.hmacSecret,
          canonicalHmacMessage({
            method: 'POST',
            path: GRANT_PATH,
            deliveryId,
            body: rawBody,
          }),
          ts,
        )
        const res = await doFetch(`${base}${GRANT_PATH}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-signature': `t=${ts},v1=${signature}`,
            'x-delivery-id': deliveryId,
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

    async listShowcaseByAuthors(
      authorIds: string[],
      from: Date,
      to: Date,
    ): Promise<ShowcaseByAuthorItem[] | null> {
      try {
        const rawBody = JSON.stringify({
          authorIds,
          from: from.toISOString(),
          to: to.toISOString(),
        })
        const ts = Math.floor(now().getTime() / 1000)
        const signature = signHmac(
          opts.hmacSecret,
          canonicalHmacMessage({ method: 'POST', path: SHOWCASE_BY_AUTHORS_PATH, body: rawBody }),
          ts,
        )
        const res = await doFetch(`${base}${SHOWCASE_BY_AUTHORS_PATH}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-signature': `t=${ts},v1=${signature}`,
          },
          body: rawBody,
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!res.ok) {
          opts.logger?.warn('hub.showcase_by_authors_failed', { status: res.status })
          return null
        }
        const body = (await res.json()) as { items?: unknown }
        if (!Array.isArray(body.items)) return null
        return body.items
          .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
          .map((i) => ({
            authorId: typeof i.authorId === 'string' ? i.authorId : '',
            title: typeof i.title === 'string' ? i.title : '',
            playId: typeof i.playId === 'string' ? i.playId : null,
            createdAt: typeof i.createdAt === 'string' ? i.createdAt : '',
          }))
          .filter((i) => i.authorId !== '')
      } catch (error) {
        // Best-effort: o report degrada SEM a lista de jogos (games: null).
        opts.logger?.warn('hub.showcase_by_authors_error', {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }
    },

    async listShowcaseByAuthor(profileId: string, limit: number): Promise<PublicGameItem[] | null> {
      try {
        const rawBody = JSON.stringify({ authorId: profileId, limit })
        const ts = Math.floor(now().getTime() / 1000)
        const signature = signHmac(
          opts.hmacSecret,
          canonicalHmacMessage({ method: 'POST', path: SHOWCASE_BY_AUTHOR_PATH, body: rawBody }),
          ts,
        )
        const res = await doFetch(`${base}${SHOWCASE_BY_AUTHOR_PATH}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-signature': `t=${ts},v1=${signature}`,
          },
          body: rawBody,
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!res.ok) {
          opts.logger?.warn('hub.showcase_by_author_failed', { status: res.status })
          return null
        }
        const body = (await res.json()) as { items?: unknown }
        if (!Array.isArray(body.items)) return null
        return body.items
          .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
          .map((i) => ({
            title: typeof i.title === 'string' ? i.title : '',
            playId: typeof i.playId === 'string' ? i.playId : null,
            coverUrl: typeof i.coverImageUrl === 'string' ? i.coverImageUrl : null,
            publishedAt: typeof i.createdAt === 'string' ? i.createdAt : '',
          }))
      } catch (error) {
        // Best-effort: o perfil público degrada SEM a seção de jogos (games: []).
        opts.logger?.warn('hub.showcase_by_author_error', {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }
    },

    async listActivityByAuthors(authorIds: string[]): Promise<HubAuthorActivity[] | null> {
      try {
        const rawBody = JSON.stringify({ authorIds })
        const ts = Math.floor(now().getTime() / 1000)
        const signature = signHmac(
          opts.hmacSecret,
          canonicalHmacMessage({ method: 'POST', path: ACTIVITY_BY_AUTHORS_PATH, body: rawBody }),
          ts,
        )
        const res = await doFetch(`${base}${ACTIVITY_BY_AUTHORS_PATH}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-signature': `t=${ts},v1=${signature}`,
          },
          body: rawBody,
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!res.ok) {
          opts.logger?.warn('hub.activity_by_authors_failed', { status: res.status })
          return null
        }
        const body = (await res.json()) as { items?: unknown }
        if (!Array.isArray(body.items)) return null
        return body.items
          .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
          .map((i) => ({
            authorId: typeof i.authorId === 'string' ? i.authorId : '',
            clubThreads: typeof i.clubThreads === 'number' ? i.clubThreads : 0,
            clubComments: typeof i.clubComments === 'number' ? i.clubComments : 0,
            lastClubActivityAt:
              typeof i.lastClubActivityAt === 'string' ? i.lastClubActivityAt : null,
            showcasePublished: typeof i.showcasePublished === 'number' ? i.showcasePublished : 0,
            showcasePlays: typeof i.showcasePlays === 'number' ? i.showcasePlays : 0,
            lastShowcaseAt: typeof i.lastShowcaseAt === 'string' ? i.lastShowcaseAt : null,
          }))
          .filter((i) => i.authorId !== '')
      } catch (error) {
        // Best-effort: os cartões de Clube/Mural degradam p/ "indisponível".
        opts.logger?.warn('hub.activity_by_authors_error', {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }
    },

    async checkPlay(playId: string): Promise<PlayCheckResult | null> {
      try {
        const rawBody = JSON.stringify({ playId })
        const ts = Math.floor(now().getTime() / 1000)
        const signature = signHmac(
          opts.hmacSecret,
          canonicalHmacMessage({ method: 'POST', path: PLAY_CHECK_PATH, body: rawBody }),
          ts,
        )
        const res = await doFetch(`${base}${PLAY_CHECK_PATH}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-signature': `t=${ts},v1=${signature}`,
          },
          body: rawBody,
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!res.ok) {
          opts.logger?.warn('hub.play_check_failed', { status: res.status })
          return null
        }
        const body = (await res.json()) as { visible?: unknown; authorId?: unknown }
        return {
          visible: body.visible === true,
          authorId: typeof body.authorId === 'string' ? body.authorId : null,
        }
      } catch (error) {
        // Indisponível → null: o chamador NÃO grava o marco (fail-closed do anti-farm).
        opts.logger?.warn('hub.play_check_error', {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }
    },
  }
}

/** No-op (sem `HUB_BASE_URL` — dev/local ou hub não configurado): não notifica nada. */
export const noopHubGateway: HubGateway = {
  async notifyAccessChanged() {},
  async listShowcaseByAuthors() {
    return null
  },
  async listShowcaseByAuthor() {
    return null
  },
  async listActivityByAuthors() {
    return null
  },
  async checkPlay() {
    return null
  },
}
