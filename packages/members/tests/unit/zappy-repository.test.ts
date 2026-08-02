import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import { zappyMetricsPeriod } from '../../src/infrastructure/persistence/drizzle/zappy.repository'

describe('DrizzleZappyRepository', () => {
  test('codifica os dois limites da janela de métricas como timestamp', () => {
    const from = new Date('2026-08-01T03:00:00.000Z')
    const to = new Date('2026-09-01T03:00:00.000Z')
    const query = new PgDialect().sqlToQuery(zappyMetricsPeriod(from, to))

    expect(query.params).toEqual([
      'assistant',
      '2026-08-01T03:00:00.000Z',
      '2026-09-01T03:00:00.000Z',
    ])
    expect(query.typings).toEqual(['none', 'timestamp', 'timestamp'])
  })
})
