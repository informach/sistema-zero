import type { Logger } from '@sistemazero/core/logging'
import type { AuditEmitter, AuditEvent } from '../../domain/audit/audit-emitter.port'

export interface HttpAuditEmitterOptions {
  /** Base do serviço auth (`AUTH_URL`). */
  authUrl: string
  /** `AUTH_INTERNAL_TOKEN` — prova ao auth que a chamada veio do gateway. */
  internalToken: string | undefined
  /** Timeout do POST de auditoria (curto — nunca segura nada). */
  timeoutMs?: number
  logger: Logger
}

/**
 * Emissor de auditoria via HTTP S2S para o auth (`POST /auth/internal/audit`).
 * BEST-EFFORT: engole qualquer erro (rede/timeout/HTTP) num `warn` — a auditoria
 * jamais derruba o request proxeado. Sem `internalToken` (dev) → no-op silencioso.
 */
export function createHttpAuditEmitter(opts: HttpAuditEmitterOptions): AuditEmitter {
  const url = `${opts.authUrl.replace(/\/+$/, '')}/auth/internal/audit`
  const timeoutMs = opts.timeoutMs ?? 5000
  return {
    name: 'http-audit-emitter',
    async emit(event: AuditEvent): Promise<void> {
      // Sem token o auth recusaria (e em dev a checagem é fail-open) — não vale a chamada.
      if (!opts.internalToken) return
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-internal-token': opts.internalToken,
          },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!res.ok) {
          opts.logger.warn('gateway.audit_emit_http_error', {
            requestId: event.requestId,
            action: event.action,
            status: res.status,
          })
        }
      } catch (error) {
        opts.logger.warn('gateway.audit_emit_failed', {
          requestId: event.requestId,
          action: event.action,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  }
}
