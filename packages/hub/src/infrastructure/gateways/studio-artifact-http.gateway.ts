import { randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type {
  CleanupShowcaseArtifactsArgs,
  StudioArtifactGateway,
} from '../../domain/ports/studio-artifact-gateway.port'

const DEFAULT_TIMEOUT_MS = 4_000
/** Path EXATO que o BFF do kids verifica (canônico `<MÉTODO>.<path>.<corpo>`). */
const CLEANUP_PATH = '/api/studio/cleanup'
const CLEANUP_ATTEMPTS = 3
const CLEANUP_RETRY_BASE_MS = 100

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const retryableStatus = (status: number) => status === 408 || status === 429 || status >= 500

export interface StudioArtifactHttpGatewayOptions {
  /** Base do BFF do kids (ex.: http://community-kids.railway.internal:3008). Sem `/api`. */
  baseUrl: string
  /** Segredo HMAC (= GATEWAY_HMAC_SECRET) que o BFF verifica. Sem ele → no-op silencioso. */
  hmacSecret?: string
  timeoutMs?: number
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
  /** Injetável em testes (clock do timestamp da assinatura). */
  now?: () => Date
  logger?: Logger
}

/**
 * Adapter HTTP hub → BFF do kids p/ a limpeza de R2 na moderação. Espelha o
 * `postSignedWebhook` do `members-http.gateway`: HMAC canônico `<MÉTODO>.<path>.<corpo>`
 * + retry, BEST-EFFORT (NUNCA lança — o `ModerationService` dispara em `void`; uma
 * rejeição viraria unhandled rejection). Sem segredo HMAC (dev/local) → no-op.
 */
export function createStudioArtifactHttpGateway(
  opts: StudioArtifactHttpGatewayOptions,
): StudioArtifactGateway {
  const doFetch = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/$/, '')
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const now = opts.now ?? (() => new Date())

  return {
    async cleanupShowcaseArtifacts(args: CleanupShowcaseArtifactsArgs): Promise<void> {
      if (!opts.hmacSecret) return
      const rawBody = JSON.stringify({ playId: args.playId, coverUrl: args.coverUrl })
      const deliveryId = randomUUID()
      for (let attempt = 1; attempt <= CLEANUP_ATTEMPTS; attempt++) {
        try {
          // Assinatura DENTRO do try (falha ao assinar cai no best-effort abaixo).
          const ts = Math.floor(now().getTime() / 1000)
          const signature = signHmac(
            opts.hmacSecret,
            canonicalHmacMessage({ method: 'POST', path: CLEANUP_PATH, body: rawBody }),
            ts,
          )
          const res = await doFetch(`${base}${CLEANUP_PATH}`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-signature': `t=${ts},v1=${signature}`,
              'x-delivery-id': deliveryId,
            },
            body: rawBody,
            signal: AbortSignal.timeout(timeoutMs),
          })
          if (res.ok) return
          if (retryableStatus(res.status) && attempt < CLEANUP_ATTEMPTS) {
            await delay(CLEANUP_RETRY_BASE_MS * attempt)
            continue
          }
          opts.logger?.warn('studio.cleanup_failed', {
            playId: args.playId,
            status: res.status,
            attempt,
          })
          return
        } catch (error) {
          if (attempt < CLEANUP_ATTEMPTS) {
            await delay(CLEANUP_RETRY_BASE_MS * attempt)
            continue
          }
          // Best-effort: a moderação NUNCA falha por causa da limpeza de R2.
          opts.logger?.warn('studio.cleanup_error', {
            playId: args.playId,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          })
          return
        }
      }
    },
  }
}
