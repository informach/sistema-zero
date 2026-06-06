import { describe, expect, test } from 'bun:test'
import { withSentryMirror } from '../../src/infrastructure/observability/sentry'
import { recordingLogger } from '../helpers'

interface Captured {
  message: string
  fingerprint: string[]
  context?: Record<string, unknown>
}

function mirror() {
  const captured: Captured[] = []
  const { logger: inner, entries } = recordingLogger()
  const logger = withSentryMirror(inner, (message, fingerprint, context) => {
    captured.push({ message, fingerprint, context })
  })
  return { logger, captured, entries }
}

/**
 * Política do espelho da BORDA: 502/503/504 do access log são o sinal que SÓ o
 * gateway enxerga (upstream fora); 500 é dup (bug nosso já espelhado por
 * pipeline.stage_failed / 500 do upstream já no Sentry do próprio serviço).
 */
describe('withSentryMirror (política da borda)', () => {
  test('só ERROR é espelhado; o log interno sempre roda', () => {
    const { logger, captured, entries } = mirror()
    logger.info('gateway.listening', { port: 3000 })
    logger.warn('proxy.attempt_failed', { reason: 'connect' })
    logger.error('pipeline.stage_failed', { route: 'r1' })
    expect(captured).toHaveLength(1)
    expect(captured[0]?.fingerprint).toEqual(['pipeline.stage_failed'])
    expect(entries).toHaveLength(3) // nada é suprimido do log real
  })

  test('gateway.access 502/503/504 → espelha com fingerprint rota+status', () => {
    const { logger, captured } = mirror()
    logger.error('gateway.access', { route: 'payments-create', status: 502 })
    logger.error('gateway.access', { route: 'members-catalog', status: 503 })
    expect(captured.map((c) => c.fingerprint)).toEqual([
      ['gateway.access', 'payments-create', '502'],
      ['gateway.access', 'members-catalog', '503'],
    ])
  })

  test('gateway.access 500 NÃO espelha (dup do upstream/pipeline)', () => {
    const { logger, captured, entries } = mirror()
    logger.error('gateway.access', { route: 'r1', status: 500 })
    expect(captured).toHaveLength(0)
    expect(entries).toHaveLength(1) // o access log em si continua emitido
  })

  test('eventos capturados como exceção em outro ponto são pulados (anti-dup)', () => {
    const { logger, captured } = mirror()
    logger.error('gateway.unhandled', { error: { message: 'x' } })
    logger.error('app.boot_failed', { error: { message: 'x' } })
    expect(captured).toHaveLength(0)
  })

  test('falha do capture nunca propaga (observabilidade não derruba o caminho)', () => {
    const { logger: inner } = recordingLogger()
    const logger = withSentryMirror(inner, () => {
      throw new Error('sentry fora')
    })
    expect(() => logger.error('pipeline.stage_failed', {})).not.toThrow()
  })
})
