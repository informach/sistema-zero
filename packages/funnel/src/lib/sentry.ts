// Sentry do funil (server-only — NUNCA importar de ilha React). Espelha o
// padrão do payments/catalog/auth: erros apenas (sem tracing), PII-free,
// agrupamento por nome do evento. Sem DSN é no-op seguro (todas as chamadas
// `Sentry.capture*` viram no-op quando não inicializado).
//
// Dois pontos de init: `scripts/start.mjs` (boot de produção — cobre erro fora
// de request) e `getDeps()` (dev / fallback). `initSentry` é idempotente
// (detecta cliente já criado pelo wrapper — mesmo módulo via node_modules).

import * as Sentry from '@sentry/bun'

export interface SentryOptions {
  /** Ausente = Sentry desligado (dev/local). */
  dsn?: string
  environment: string
  /** Commit do deploy (Railway injeta `RAILWAY_GIT_COMMIT_SHA`) — vira o release. */
  release?: string
}

export function initSentry(opts: SentryOptions): boolean {
  if (!opts.dsn) return false
  if (Sentry.getClient()) return true // já inicializado (wrapper de boot)
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment,
    release: opts.release,
    // Nunca anexar headers/IP/cookies por default — os logs já são PII-free por
    // convenção e o Sentry não pode virar o vazamento.
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
  return true
}

/** Exceção não tratada (rota/render) — evento canônico com stack. */
export function captureError(err: unknown): void {
  try {
    Sentry.captureException(err)
  } catch {
    // observabilidade nunca derruba o caminho principal
  }
}

/**
 * Espelho de log de ERRO → evento Sentry (fingerprint = nome do evento;
 * contexto vira `extra`). Convenção do monorepo: log `*_error`/`*_failed` é
 * sinal alertável — com o espelho ele gera issue/alerta sem tocar call sites.
 */
export function mirrorErrorEvent(message: string, context?: Record<string, unknown>): void {
  try {
    Sentry.withScope((scope) => {
      scope.setLevel('error')
      scope.setFingerprint([message])
      if (context) scope.setContext('event', context)
      Sentry.captureMessage(message)
    })
  } catch {
    // nunca propagar falha de observabilidade
  }
}
