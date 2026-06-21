import * as Sentry from '@sentry/bun'
import { createApplication } from './composition-root'
import { loadEnv } from './infrastructure/config/env'
import { flushSentry, initSentry } from './infrastructure/observability/sentry'

const env = loadEnv()
// O MAIS CEDO possível (antes de instanciar a aplicação): erros do próprio boot
// já são capturados. Sem DSN é no-op.
const sentryEnabled = initSentry({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  release: process.env.RAILWAY_GIT_COMMIT_SHA,
})
const app = createApplication(env)
if (sentryEnabled) app.logger.info('sentry.enabled', { environment: env.NODE_ENV })

/** Tempo máximo (ms) para o shutdown gracioso antes de forçar a saída. */
const SHUTDOWN_TIMEOUT_MS = 15_000

let shuttingDown = false

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return // ignora sinais repetidos durante o shutdown
  shuttingDown = true
  app.logger.info('app.shutdown', { signal })

  // Watchdog: garante a saída mesmo se app.stop() travar/pendurar.
  const watchdog = setTimeout(() => {
    app.logger.error('app.shutdown_timeout', { signal })
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  watchdog.unref()

  try {
    await app.stop()
    await flushSentry() // entrega eventos pendentes antes de sair (best-effort)
    process.exit(exitCode)
  } catch (error) {
    app.logger.error('app.shutdown_failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    await flushSentry()
    process.exit(1)
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

// Erros não tratados após o boot: registra, captura no Sentry (com stack — o
// flush acontece dentro do shutdown) e encerra de forma controlada.
process.on('unhandledRejection', (reason) => {
  app.logger.error('app.unhandled_rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  })
  Sentry.captureException(reason)
  void shutdown('unhandledRejection', 1)
})
process.on('uncaughtException', (error) => {
  app.logger.error('app.uncaught_exception', { error: error.message })
  Sentry.captureException(error)
  void shutdown('uncaughtException', 1)
})

try {
  await app.start()
} catch (error) {
  app.logger.error('app.boot_failed', {
    error: error instanceof Error ? error.message : String(error),
  })
  Sentry.captureException(error)
  await flushSentry()
  process.exit(1)
}
