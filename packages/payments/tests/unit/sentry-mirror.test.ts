import { describe, expect, test } from 'bun:test'
import type { Logger } from '../../src/infrastructure/logging/logger'
import { withSentryMirror } from '../../src/infrastructure/observability/sentry'

function recordingLogger() {
  const lines: Array<{ level: string; message: string }> = []
  const logger: Logger = {
    debug: (m) => lines.push({ level: 'debug', message: m }),
    info: (m) => lines.push({ level: 'info', message: m }),
    warn: (m) => lines.push({ level: 'warn', message: m }),
    error: (m) => lines.push({ level: 'error', message: m }),
  }
  return { logger, lines }
}

describe('withSentryMirror (logs ERROR → eventos Sentry)', () => {
  test('espelha SÓ o nível error, com mensagem e contexto', () => {
    const captured: Array<{ message: string; context?: Record<string, unknown> }> = []
    const { logger, lines } = recordingLogger()
    const mirrored = withSentryMirror(logger, (message, context) =>
      captured.push({ message, context }),
    )

    mirrored.debug('a')
    mirrored.info('b')
    mirrored.warn('c')
    mirrored.error('outbox.publish_failed', { eventId: 'e1' })

    expect(captured).toEqual([{ message: 'outbox.publish_failed', context: { eventId: 'e1' } }])
    expect(lines).toHaveLength(4) // o log original SEMPRE acontece
  })

  test('pula eventos já capturados como exceção (anti-duplicata)', () => {
    const captured: string[] = []
    const { logger } = recordingLogger()
    const mirrored = withSentryMirror(logger, (m) => captured.push(m))

    mirrored.error('unhandled.error')
    mirrored.error('gateway.error')
    mirrored.error('app.boot_failed')
    mirrored.error('webhook.amount_mismatch') // este NÃO tem capture próprio → espelha

    expect(captured).toEqual(['webhook.amount_mismatch'])
  })

  test('falha na captura NUNCA derruba o log (observabilidade é best-effort)', () => {
    const { logger, lines } = recordingLogger()
    const mirrored = withSentryMirror(logger, () => {
      throw new Error('sentry fora do ar')
    })

    expect(() => mirrored.error('reconcile.tick_failed')).not.toThrow()
    expect(lines).toEqual([{ level: 'error', message: 'reconcile.tick_failed' }])
  })
})
