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
 * Inicializa o Sentry (erros apenas — sem tracing/logs). Sem DSN é no-op: todas
 * as chamadas `Sentry.capture*` viram no-op seguro. Espelha os demais serviços.
 */
export function initSentry(opts: SentryOptions): boolean {
  if (!opts.dsn) return false
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment,
    release: opts.release,
    // Nunca anexar headers/IP/cookies por default — tokens do Gmail e corpos de
    // e-mail de clientes não podem vazar pro Sentry.
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
 * Eventos já capturados como EXCEÇÃO (com stack) em outro ponto (error-handler
 * central / process handlers do index.ts) — espelhar a linha de log
 * correspondente duplicaria o evento no Sentry.
 */
const MIRROR_SKIP = new Set([
  'unhandled.error',
  'app.unhandled_rejection',
  'app.uncaught_exception',
  'app.boot_failed',
])

/** Assinatura injetável p/ teste (default = captureMessage com fingerprint). */
export type ErrorEventCapture = (message: string, context?: Record<string, unknown>) => void

/**
 * Decorator do `Logger`: espelha TODO log de nível ERROR para o Sentry como
 * evento. Agrupamento por NOME do evento (fingerprint); contexto vira `extra`.
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
        capture(m, c)
      } catch {
        // nunca propagar falha de observabilidade
      }
    },
  }
}

function captureErrorEvent(message: string, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    scope.setLevel('error')
    scope.setFingerprint([message])
    if (context) scope.setContext('event', context)
    Sentry.captureMessage(message)
  })
}
