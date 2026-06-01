import { serializeError } from '@sistemazero/core/logging'
import { createApplication } from './composition-root'
import { loadEnv } from './infrastructure/config/env'

const env = loadEnv()
const app = await createApplication(env)

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
    process.exit(exitCode)
  } catch (error) {
    app.logger.error('app.shutdown_failed', { error: serializeError(error) })
    process.exit(1)
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

process.on('unhandledRejection', (reason) => {
  app.logger.error('app.unhandled_rejection', { error: serializeError(reason) })
  void shutdown('unhandledRejection', 1)
})
process.on('uncaughtException', (error) => {
  app.logger.error('app.uncaught_exception', { error: serializeError(error) })
  void shutdown('uncaughtException', 1)
})

try {
  await app.start()
} catch (error) {
  app.logger.error('app.boot_failed', { error: serializeError(error) })
  process.exit(1)
}
