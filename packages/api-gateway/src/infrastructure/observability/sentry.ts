import * as Sentry from '@sentry/bun'
import type { Logger } from '@sistemazero/core/logging'

export interface SentryOptions {
  /** Ausente = Sentry desligado (dev/local). */
  dsn?: string
  environment: string
  /** Commit do deploy (Railway injeta `RAILWAY_GIT_COMMIT_SHA`) — vira o release. */
  release?: string
}

/**
 * Inicializa o Sentry (erros apenas — sem tracing/logs por enquanto). Sem DSN é
 * no-op: todas as chamadas `Sentry.capture*` viram no-op seguro. Espelha o
 * padrão do payments/auth/members, com a política de espelho ADAPTADA À BORDA
 * (ver `withSentryMirror`).
 */
export function initSentry(opts: SentryOptions): boolean {
  if (!opts.dsn) return false
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment,
    release: opts.release,
    // BORDA pública: nunca anexar headers/IP/cookies por default — o access log
    // já carrega clientIp/userAgent por convenção própria; o Sentry não pode
    // virar o vazamento (credenciais de borda, identity headers com PII).
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
  return true
}

/** Aguarda o envio dos eventos pendentes (chamar no shutdown, best-effort). */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  await Sentry.flush(timeoutMs).catch(() => {})
}

/**
 * Eventos já capturados como EXCEÇÃO (com stack) em outro ponto (error-handler /
 * process handlers do index.ts) — espelhar a linha de log correspondente
 * duplicaria o evento no Sentry.
 */
const MIRROR_SKIP = new Set([
  'gateway.unhandled',
  'app.unhandled_rejection',
  'app.uncaught_exception',
  'app.boot_failed',
])

/** Assinatura injetável p/ teste (default = captureMessage com fingerprint). */
export type ErrorEventCapture = (
  message: string,
  fingerprint: string[],
  context?: Record<string, unknown>,
) => void

/**
 * Decorator do `Logger`: espelha logs de nível ERROR para o Sentry como evento,
 * com a política da BORDA para o access log:
 *
 *  - `gateway.access` com **status 500** NÃO é espelhado: ou é bug NOSSO (já
 *    espelhado por `pipeline.stage_failed`/capturado em `gateway.unhandled`) ou
 *    é um 500 do UPSTREAM repassado — que já está no Sentry do próprio serviço
 *    (correlacione pelo requestId). Espelhar duplicaria sem informação nova.
 *  - `gateway.access` com **502/503/504** É espelhado: upstream inalcançável/
 *    timeout/circuito aberto é o sinal que SÓ a borda enxerga (o Sentry do
 *    upstream é cego exatamente quando ele está fora). Fingerprint por
 *    rota+status — uma issue por rota/sintoma, não uma avalanche por request.
 *  - Demais ERRORs (`pipeline.stage_failed`, `gateway.rate_limit_unavailable`
 *    promovido, etc.): fingerprint pelo nome do evento (padrão do monorepo).
 *
 * Observabilidade NUNCA derruba o caminho principal (capture em try/catch).
 */
export function withSentryMirror(
  inner: Logger,
  capture: ErrorEventCapture = captureErrorEvent,
): Logger {
  return {
    debug: (m, c) => inner.debug(m, c),
    info: (m, c) => inner.info(m, c),
    warn: (m, c) => inner.warn(m, c),
    error: (m, c) => {
      inner.error(m, c)
      if (MIRROR_SKIP.has(m)) return
      try {
        if (m === 'gateway.access') {
          const status = typeof c?.status === 'number' ? c.status : 0
          if (status === 500) return // dup: bug nosso ou 500 do upstream (ver doc acima)
          const route = typeof c?.route === 'string' ? c.route : (c?.path ?? 'unknown')
          capture(m, [m, String(route), String(status)], c)
          return
        }
        capture(m, [m], c)
      } catch {
        // nunca propagar falha de observabilidade
      }
    },
  }
}

function captureErrorEvent(
  message: string,
  fingerprint: string[],
  context?: Record<string, unknown>,
): void {
  Sentry.withScope((scope) => {
    scope.setLevel('error')
    scope.setFingerprint(fingerprint)
    if (context) scope.setContext('event', context)
    Sentry.captureMessage(message)
  })
}
