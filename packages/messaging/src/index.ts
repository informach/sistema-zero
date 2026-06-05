import { createApplication } from './composition-root'
import { loadEnv } from './infrastructure/config/env'
import { captureException, flushSentry, initSentry } from './infrastructure/observability/sentry'

const env = loadEnv()
// Sentry ANTES de tudo (no-op sem DSN) — release = commit do deploy no Railway.
initSentry({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  release: process.env.RAILWAY_GIT_COMMIT_SHA,
})
const app = createApplication(env)

/** Tempo máximo (ms) para o shutdown gracioso antes de forçar a saída. */
const SHUTDOWN_TIMEOUT_MS = 15_000

let shuttingDown = false

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  app.logger.info('app.shutdown', { signal })

  const watchdog = setTimeout(() => {
    app.logger.error('app.shutdown_timeout', { signal })
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  watchdog.unref()

  try {
    await app.stop()
    await flushSentry()
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

process.on('unhandledRejection', (reason) => {
  captureException(reason)
  app.logger.error('app.unhandled_rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  })
  void shutdown('unhandledRejection', 1)
})
process.on('uncaughtException', (error) => {
  captureException(error)
  app.logger.error('app.uncaught_exception', { error: error.message })
  void shutdown('uncaughtException', 1)
})

try {
  await app.start()
} catch (error) {
  captureException(error)
  app.logger.error('app.boot_failed', {
    error: error instanceof Error ? error.message : String(error),
  })
  await flushSentry()
  process.exit(1)
}
