import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { PublicationView } from '../../src/application/mappers/views'
import type { BestTimesView } from '../../src/application/metrics/metrics.service'
import type { PublicationFormat } from '../../src/domain/publication/publication'
import { buildTestApp, request, type TestApp } from '../helpers'
import { completeChecklist, createContent } from './contents.test'

async function publishedAt(
  t: TestApp,
  format: PublicationFormat,
  when: Date,
  views = 0,
): Promise<string> {
  const content = await createContent(t.app)
  await completeChecklist(t.app, content)
  await request(t.app, 'POST', `/marketing/contents/${content.id}/stage`, {
    body: { to: 'approved' },
  })
  const createRes = await request(t.app, 'POST', `/marketing/contents/${content.id}/publications`, {
    body: { formats: [format] },
  })
  const [pub] = (await createRes.json()) as PublicationView[]
  const id = (pub as PublicationView).id
  await request(t.app, 'POST', `/marketing/publications/${id}/mark-published`, { body: {} })
  const row = t.repos.publications.rows.get(id)
  if (row) row.publishedAt = when
  if (views > 0) {
    t.repos.metrics.publicationSnapshots.push({
      id: randomUUID(),
      publicationId: id,
      capturedAt: new Date(),
      views,
      likes: Math.floor(views / 10),
      comments: 0,
      shares: 0,
      saves: 0,
      reach: null,
      watchTimeSeconds: null,
      avgWatchRatio: null,
      raw: {},
    })
  }
  return id
}

describe('GET /marketing/metrics/best-times (heatmap 7×24 em SP)', () => {
  it('agrupa por dia×hora NO FUSO DE SP (virada de dia UTC não vaza) e soma views', async () => {
    const t = buildTestApp()
    // 02:30Z de quarta 08/07 = 23:30 de TERÇA 07/07 em SP (dow 2, hora 23).
    await publishedAt(t, 'ig_feed', new Date('2026-07-08T02:30:00Z'), 100)
    // Mais um post na MESMA célula SP (02:10Z → 23:10 de terça).
    await publishedAt(t, 'ig_reels', new Date('2026-07-08T02:10:00Z'), 50)
    // 15:00Z de quarta = 12:00 de QUARTA em SP (dow 3, hora 12).
    await publishedAt(t, 'yt_video', new Date('2026-07-08T15:00:00Z'), 300)

    const res = await request(t.app, 'GET', '/marketing/metrics/best-times?days=30')
    expect(res.status).toBe(200)
    const body = (await res.json()) as BestTimesView
    expect(body.totalPosts).toBe(3)
    expect(body.cells).toEqual([
      { dow: 2, hour: 23, posts: 2, views: 150, likes: 15 },
      { dow: 3, hour: 12, posts: 1, views: 300, likes: 30 },
    ])
  })

  it('filtro de rede e janela de dias funcionam; fora da janela fica de fora', async () => {
    const t = buildTestApp()
    await publishedAt(t, 'ig_feed', new Date(Date.now() - 2 * 86_400_000), 10)
    await publishedAt(t, 'yt_video', new Date(Date.now() - 2 * 86_400_000), 20)
    await publishedAt(t, 'ig_feed', new Date(Date.now() - 200 * 86_400_000), 999)

    const onlyIg = (await (
      await request(t.app, 'GET', '/marketing/metrics/best-times?network=instagram&days=30')
    ).json()) as BestTimesView
    expect(onlyIg.totalPosts).toBe(1)
    expect(onlyIg.cells.reduce((sum, c) => sum + c.views, 0)).toBe(10)

    const wide = (await (
      await request(t.app, 'GET', '/marketing/metrics/best-times?days=30')
    ).json()) as BestTimesView
    expect(wide.totalPosts).toBe(2) // o de 200d fica fora da janela de 30d
  })

  it('sem publicações → células vazias (nunca null)', async () => {
    const t = buildTestApp()
    const body = (await (
      await request(t.app, 'GET', '/marketing/metrics/best-times')
    ).json()) as BestTimesView
    expect(body).toEqual({ cells: [], totalPosts: 0 })
  })
})
