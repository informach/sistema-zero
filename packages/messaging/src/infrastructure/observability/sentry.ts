import * as Sentry from '@sentry/bun'
import type { Logger } from '../logging/logger'

export interface SentryOptions {
  /** Ausente = Sentry desligado (dev/local). */
  dsn?: string
  environment: string
  /** Commit do deploy (Railway injeta `RAILWAY_GIT_COMMIT_SHA`) — vira o release. */
  release?: string
}

/**
 * Inicializa o Sentry (erros apenas — sem tracing). Sem DSN é no-op: todas as
 * chamadas `Sentry.capture*` viram no-op seguro. Espelha o payments.
 */
export function initSentry(opts: SentryOptions): boolean {
  if (!opts.dsn) return false
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment,
    release: opts.release,
    // Mensageria carrega PII (e-mail/telefone de destinatários) nos payloads —
    // nunca anexar headers/IP por default; os logs do package são PII-free por
    // convenção e o Sentry não pode virar o vazamento.
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
 * evento — a convenção do package é "log ERROR = sinal alertável" (tick do
 * worker, mensagem presa, outbox dead-letter, retenção falhando...). Agrupamento
 * por NOME do evento (fingerprint); contexto vira `extra`. Observabilidade NUNCA
 * derruba o caminho principal (capture em try/catch).
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

/** Captura uma EXCEÇÃO real (com stack) — usada pelo error-handler/process handlers. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  try {
    Sentry.withScope((scope) => {
      if (context) scope.setContext('event', context)
      Sentry.captureException(error)
    })
  } catch {
    // nunca propagar falha de observabilidade
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
