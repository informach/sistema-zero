import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { type AnalyticsRow, groupAnalytics } from '@sistemazero/marketing-contracts'

function row(overrides: Partial<AnalyticsRow> = {}): AnalyticsRow {
  return {
    publicationId: randomUUID(),
    editionId: randomUUID(),
    pieceId: randomUUID(),
    title: 'Peça',
    network: 'instagram',
    sourceType: 'connected-account',
    publishedAt: '2026-10-01T12:00:00Z',
    collectionVersion: 1,
    dimensions: {
      objective: 'Praticar',
      audienceNeed: 'Começar',
      series: 'Primeiro jogo',
      format: 'story',
    },
    metrics: {
      id: randomUUID(),
      capturedAt: '2026-10-02T12:00:00Z',
      views: 100,
      saves: 10,
      likes: 0,
      comments: null,
      shares: null,
      availability: {
        views: 'observed',
        saves: 'observed',
        likes: 'observed',
        comments: 'unavailable',
        shares: 'unavailable',
      },
    },
    ...overrides,
  }
}
test('cobertura e razão usam observações pareadas; ausente não se transforma em zero', () => {
  const missing = row()
  missing.metrics!.views = null
  missing.metrics!.availability.views = 'unavailable'
  missing.metrics!.saves = 90
  const result = groupAnalytics([row(), missing], 'objective')[0]!
  expect(result.posts).toBe(2)
  expect(result.metrics.views).toEqual({ total: 100, observed: 1 })
  expect(result.metrics.saves).toEqual({ total: 100, observed: 2 })
  expect(result.metrics.likes).toEqual({ total: 0, observed: 2 })
  expect(result.metrics.comments).toEqual({ total: null, observed: 0 })
  expect(result.savesPerView).toEqual({ value: 0.1, posts: 1, saves: 10, views: 100 })
})
test('rede, formato, idade, origem e definição não são misturados', () => {
  const older = row()
  older.metrics!.capturedAt = '2026-10-15T12:00:00Z'
  const base = row()
  expect(
    groupAnalytics(
      [
        base,
        older,
        row({ network: 'facebook' }),
        row({ collectionVersion: 0 }),
        row({ sourceType: 'unlinked' }),
        row({ dimensions: { ...base.dimensions, format: 'reel' } }),
        row({ metrics: null, collectionVersion: null }),
      ],
      'series',
    ),
  ).toHaveLength(7)
})
test('denominador zero e coleta anterior à publicação não produzem razão', () => {
  const zero = row()
  zero.metrics!.views = 0
  expect(groupAnalytics([zero], 'audienceNeed')[0]!.savesPerView.value).toBeNull()
  const future = row({ publishedAt: '2026-10-10T12:00:00Z' })
  const group = groupAnalytics([future], 'format')[0]!
  expect(group.ageBand).toBe('unavailable')
  expect(group.metrics.views.total).toBeNull()
})
