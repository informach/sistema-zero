// Wrapper de PRODUÇÃO do servidor SSR (no lugar de `bun ./dist/server/entry.mjs`):
//  1) Sentry no BOOT + process handlers — erro fora de request (boot, timer da
//     retenção, promise solta) vira evento; o init em getDeps() é só o fallback
//     de dev (idempotente — mesmo módulo @sentry/bun via node_modules).
//  2) Graceful shutdown — o adapter standalone NÃO trata SIGTERM: sem isto o
//     deploy matava requisições in-flight (criação de cobrança na Efí fria leva
//     ~15s). Drena até DRAIN_TIMEOUT_MS e então derruba o que restou.
// O autostart do adapter é desligado ANTES do import dinâmico do entry (a flag
// é lida no load do módulo).
process.env.ASTRO_NODE_AUTOSTART = 'disabled'

import * as Sentry from '@sentry/bun'

const dsn = process.env.SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'production',
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
}

process.on('unhandledRejection', (reason) => {
  console.error('app.unhandled_rejection', reason)
  Sentry.captureException(reason)
})
process.on('uncaughtException', (err) => {
  console.error('app.uncaught_exception', err)
  Sentry.captureException(err)
  void Sentry.flush(2000)
    .catch(() => {})
    .finally(() => process.exit(1))
})

const { startServer } = await import(new URL('../dist/server/entry.mjs', import.meta.url).href)
const { server } = startServer()

// Tempo p/ requisições in-flight terminarem (criação de cobrança ≈ 15s na Efí
// fria; o grace do Railway antes do SIGKILL é ~30s). Retry é seguro de qualquer
// forma: Idempotency-Key determinística + auto-retry da ilha de checkout.
const DRAIN_TIMEOUT_MS = 25_000
let draining = false

async function shutdown(signal) {
  if (draining) return
  draining = true
  console.error('app.shutdown', { signal })
  // Para de aceitar conexões novas e espera as in-flight; keep-alive ocioso não
  // pode segurar o close. Estourou o teto → destrói o que restou (server-destroy).
  const force = setTimeout(() => {
    server.stop().catch(() => {})
  }, DRAIN_TIMEOUT_MS)
  force.unref?.()
  await new Promise((resolve) => {
    server.server.close(() => resolve(undefined))
    server.server.closeIdleConnections?.()
  })
  clearTimeout(force)
  await Sentry.flush(2000).catch(() => {})
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
