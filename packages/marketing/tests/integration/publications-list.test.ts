import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { Content } from '../../src/domain/content/content'
import type { Publication } from '../../src/domain/publication/publication-record'
import { buildTestApp, request } from '../helpers'

function makeContent(title: string): Content {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    title,
    contentType: 'reels',
    stage: 'approved',
    brief: null,
    script: null,
    ownerUserId: null,
    ownerName: null,
    dueDate: null,
    ideaId: null,
    createdBy: randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
}

function makePublication(contentId: string, overrides: Partial<Publication> = {}): Publication {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    contentId,
    socialAccountId: null,
    network: 'instagram',
    format: 'ig_reels',
    caption: '',
    title: null,
    tags: [],
    coverAssetId: null,
    scheduledAt: null,
    publishMode: 'manual',
    status: 'draft',
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    providerSession: {},
    externalPostId: null,
    externalUrl: null,
    publishedAt: null,
    reminderSentAt: null,
    metricsLastCollectedAt: null,
    metricsNextCollectAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('GET /marketing/publications (janela)', () => {
  async function seed(t: ReturnType<typeof buildTestApp>) {
    const content = makeContent('Reels do lançamento')
    await t.repos.contents.create(content)
    const inWindow = makePublication(content.id, {
      status: 'scheduled',
      scheduledAt: new Date('2026-07-10T15:00:00Z'),
    })
    const outWindow = makePublication(content.id, {
      status: 'scheduled',
      format: 'yt_short',
      network: 'youtube',
      scheduledAt: new Date('2026-09-10T15:00:00Z'),
    })
    const failed = makePublication(content.id, {
      status: 'failed',
      format: 'tt_video',
      network: 'tiktok',
      lastError: 'boom',
    })
    await t.repos.publications.createMany([inWindow, outWindow, failed])
    return { content, inWindow, outWindow, failed }
  }

  it('filtra por from/to e devolve contentTitle (join)', async () => {
    const t = buildTestApp()
    const { inWindow } = await seed(t)
    const res = await request(
      t.app,
      'GET',
      '/marketing/publications?from=2026-07-01T00:00:00Z&to=2026-08-01T00:00:00Z',
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      items: Array<{ id: string; contentTitle: string; contentType: string }>
      total: number
      hasMore: boolean
    }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.id).toBe(inWindow.id)
    expect(body.items[0]?.contentTitle).toBe('Reels do lançamento')
    expect(body.items[0]?.contentType).toBe('reels')
    expect(body.hasMore).toBe(false)
  })

  it('sem janela + status CSV (falhas do Painel)', async () => {
    const t = buildTestApp()
    const { failed } = await seed(t)
    const res = await request(t.app, 'GET', '/marketing/publications?status=failed')
    const body = (await res.json()) as { items: Array<{ id: string }>; total: number }
    expect(body.total).toBe(1)
    expect(body.items[0]?.id).toBe(failed.id)
  })

  it('filtro por network', async () => {
    const t = buildTestApp()
    await seed(t)
    const res = await request(t.app, 'GET', '/marketing/publications?network=youtube')
    const body = (await res.json()) as { items: Array<{ network: string }> }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.network).toBe('youtube')
  })

  it('status CSV com token inválido → 400', async () => {
    const t = buildTestApp()
    const res = await request(t.app, 'GET', '/marketing/publications?status=scheduled,banana')
    expect(res.status).toBe(400)
  })

  it('from > to → 400', async () => {
    const t = buildTestApp()
    const res = await request(
      t.app,
      'GET',
      '/marketing/publications?from=2026-08-01T00:00:00Z&to=2026-07-01T00:00:00Z',
    )
    expect(res.status).toBe(400)
  })

  it('janela acima de 92 dias → 400', async () => {
    const t = buildTestApp()
    const res = await request(
      t.app,
      'GET',
      '/marketing/publications?from=2026-01-01T00:00:00Z&to=2026-07-01T00:00:00Z',
    )
    expect(res.status).toBe(400)
  })

  it('ordena por scheduled_at asc e pagina com hasMore', async () => {
    const t = buildTestApp()
    const content = makeContent('Lote')
    await t.repos.contents.create(content)
    const later = makePublication(content.id, {
      status: 'scheduled',
      scheduledAt: new Date('2026-07-20T10:00:00Z'),
    })
    const sooner = makePublication(content.id, {
      status: 'scheduled',
      format: 'yt_video',
      network: 'youtube',
      scheduledAt: new Date('2026-07-05T10:00:00Z'),
    })
    await t.repos.publications.createMany([later, sooner])
    const res = await request(t.app, 'GET', '/marketing/publications?limit=1')
    const body = (await res.json()) as { items: Array<{ id: string }>; hasMore: boolean }
    expect(body.items[0]?.id).toBe(sooner.id)
    expect(body.hasMore).toBe(true)
  })
})
