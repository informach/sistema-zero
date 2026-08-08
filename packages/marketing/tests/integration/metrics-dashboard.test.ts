import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { PublicationView } from '../../src/application/mappers/views'
import type {
  FollowersSeriesView,
  MetricsSummaryView,
} from '../../src/application/metrics/metrics.service'
import type { Network, PublicationFormat } from '../../src/domain/publication/publication'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { buildTestApp, request, type TestApp } from '../helpers'
import { completeChecklist, createContent } from './contents.test'

const NOW = Date.now()
const DAY = 86_400_000

function connectedAccount(network: Network, overrides: Partial<SocialAccount> = {}): SocialAccount {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    network,
    externalId: `${network}-ext`,
    displayName: `Conta ${network}`,
    username: null,
    accessTokenEnc: 'sealed:page-token',
    refreshTokenEnc: null,
    tokenExpiresAt: null, // token que não expira (page token) — entregue direto
    refreshExpiresAt: null,
    scopes: [],
    status: 'connected',
    metadata: {},
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function accountSnapshot(accountId: string, followers: number, capturedAt: Date) {
  return { id: randomUUID(), socialAccountId: accountId, capturedAt, followers, raw: {} }
}

function pubSnapshot(
  publicationId: string,
  stats: { views: number; likes?: number; comments?: number },
  capturedAt = new Date(NOW),
) {
  return {
    id: randomUUID(),
    publicationId,
    capturedAt,
    views: stats.views,
    likes: stats.likes ?? 0,
    comments: stats.comments ?? 0,
    shares: 0,
    saves: 0,
    reach: null,
    watchTimeSeconds: null,
    avgWatchRatio: null,
    raw: {},
  }
}

async function publishedPublication(
  t: TestApp,
  format: PublicationFormat,
  externalPostId: string | null = null,
): Promise<PublicationView> {
  const content = await createContent(t.app)
  await completeChecklist(t.app, content)
  await request(t.app, 'POST', `/marketing/contents/${content.id}/stage`, {
    body: { to: 'approved' },
  })
  const createRes = await request(t.app, 'POST', `/marketing/contents/${content.id}/publications`, {
    body: { formats: [format] },
  })
  const [pub] = (await createRes.json()) as PublicationView[]
  const marked = await request(
    t.app,
    'POST',
    `/marketing/publications/${(pub as PublicationView).id}/mark-published`,
    { body: externalPostId ? { externalPostId } : {} },
  )
  return (await marked.json()) as PublicationView
}

describe('GET /marketing/metrics/summary (contrato do dashboard)', () => {
  it('devolve accounts + networkTotals 28d + topPublications 90d por views', async () => {
    const t = buildTestApp()
    const ig = connectedAccount('instagram')
    const yt = connectedAccount('youtube')
    await t.repos.accounts.create(ig)
    await t.repos.accounts.create(yt)
    t.repos.metrics.accountSnapshots.push(
      accountSnapshot(ig.id, 100, new Date(NOW - DAY)),
      accountSnapshot(ig.id, 120, new Date(NOW)), // mais recente vence
      accountSnapshot(yt.id, 500, new Date(NOW)),
    )

    const igPub = await publishedPublication(t, 'ig_feed', 'media-1')
    const ytPub = await publishedPublication(t, 'yt_video', 'video-1')
    const velha = await publishedPublication(t, 'ig_reels', 'media-2')
    // Publicada há 40d: fora dos totais de 28d, dentro do top de 90d.
    const velhaRow = t.repos.publications.rows.get(velha.id)
    if (velhaRow) velhaRow.publishedAt = new Date(NOW - 40 * DAY)
    t.repos.metrics.publicationSnapshots.push(
      pubSnapshot(igPub.id, { views: 50, likes: 5 }),
      pubSnapshot(ytPub.id, { views: 300, likes: 10, comments: 2 }),
      pubSnapshot(velha.id, { views: 900 }),
    )

    const res = await request(t.app, 'GET', '/marketing/metrics/summary')
    expect(res.status).toBe(200)
    const body = (await res.json()) as MetricsSummaryView

    expect(body.accounts).toHaveLength(2)
    const igCard = body.accounts.find((a) => a.network === 'instagram')
    expect(igCard?.followers).toBe(120)
    expect(igCard?.accountId).toBe(ig.id)

    // 28d: a de 40 dias NÃO conta nos totais do instagram.
    const igTotals = body.networkTotals.find((n) => n.network === 'instagram')
    expect(igTotals).toEqual({ network: 'instagram', posts: 1, views: 50, likes: 5, comments: 0 })
    const ytTotals = body.networkTotals.find((n) => n.network === 'youtube')
    expect(ytTotals?.views).toBe(300)

    // Top 90d ordenado por views: a velha (900) lidera e traz a REDE.
    expect(body.topPublications[0]?.publicationId).toBe(velha.id)
    expect(body.topPublications[0]?.network).toBe('instagram')
    expect(body.topPublications.map((p) => p.views)).toEqual([900, 300, 50])
  })

  it('sem contas nem publicações → estruturas vazias (nunca null)', async () => {
    const t = buildTestApp()
    const body = (await (
      await request(t.app, 'GET', '/marketing/metrics/summary')
    ).json()) as MetricsSummaryView
    expect(body).toEqual({ accounts: [], networkTotals: [], topPublications: [] })
  })
})

describe('GET /marketing/metrics/followers-series', () => {
  it('1 ponto por DIA por conta (último snapshot do dia vence) + filtro de rede', async () => {
    const t = buildTestApp()
    const ig = connectedAccount('instagram')
    const yt = connectedAccount('youtube')
    await t.repos.accounts.create(ig)
    await t.repos.accounts.create(yt)
    // Datas RELATIVAS ao agora (America/Sao_Paulo é fixo em UTC-3): fixar dias
    // absolutos virava time-bomb — saíam da janela `days=30` quando o teste
    // rodava semanas depois (foi o que reprovou o CI em 05/08).
    const spDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
    const spNoon = (daysAgo: number) =>
      new Date(new Date(`${spDay.format(new Date(NOW))}T15:00:00.000Z`).getTime() - daysAgo * DAY)
    const day1 = spNoon(3) // 12:00 SP, D-3
    const day1Later = new Date(day1.getTime() + 6 * 3_600_000) // 18:00 SP, mesmo dia SP → vence
    const day2 = spNoon(2) // 12:00 SP, D-2
    t.repos.metrics.accountSnapshots.push(
      accountSnapshot(ig.id, 100, day1),
      accountSnapshot(ig.id, 105, day1Later), // mesmo dia SP → este vence
      accountSnapshot(ig.id, 110, day2),
      accountSnapshot(yt.id, 900, day2),
    )

    const res = await request(t.app, 'GET', '/marketing/metrics/followers-series?days=30')
    const body = (await res.json()) as FollowersSeriesView
    const igSeries = body.series.find((s) => s.accountId === ig.id)
    expect(igSeries?.network).toBe('instagram')
    expect(igSeries?.points).toEqual([
      { date: spDay.format(day1), followers: 105 },
      { date: spDay.format(day2), followers: 110 },
    ])

    const onlyYt = (await (
      await request(t.app, 'GET', '/marketing/metrics/followers-series?network=youtube&days=30')
    ).json()) as FollowersSeriesView
    expect(onlyYt.series).toHaveLength(1)
    expect(onlyYt.series[0]?.accountId).toBe(yt.id)
  })
})

describe('POST /marketing/publications/:id/link-external', () => {
  it('YouTube: extrai o videoId por regex e arma a coleta de métricas', async () => {
    const t = buildTestApp()
    const pub = await publishedPublication(t, 'yt_video')
    const res = await request(t.app, 'POST', `/marketing/publications/${pub.id}/link-external`, {
      body: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    expect(res.status).toBe(200)
    const view = (await res.json()) as PublicationView
    expect(view.externalPostId).toBe('dQw4w9WgXcQ')
    expect(t.repos.publications.rows.get(pub.id)?.metricsNextCollectAt).not.toBeNull()
  })

  it('Instagram: casa o shortcode contra a listagem PAGINADA da conta', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount('instagram'))
    const pub = await publishedPublication(t, 'ig_feed')
    t.metaApi.igMediaList = [
      { id: 'm1', permalink: 'https://www.instagram.com/p/AAA111/' },
      { id: 'm2', permalink: 'https://www.instagram.com/reel/BBB222/' },
      { id: 'm3', permalink: 'https://www.instagram.com/p/CCC333/' }, // 2ª página do fake
    ]
    const res = await request(t.app, 'POST', `/marketing/publications/${pub.id}/link-external`, {
      body: { url: 'https://www.instagram.com/p/CCC333/?igsh=abc' },
    })
    expect(res.status).toBe(200)
    expect(((await res.json()) as PublicationView).externalPostId).toBe('m3')
  })

  it('Facebook: casa pelo permalink normalizado ou pelo id numérico da URL', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount('facebook'))
    const pub = await publishedPublication(t, 'fb_post')
    t.metaApi.fbPostList = [
      { id: 'page_111', permalinkUrl: 'https://www.facebook.com/pagina/posts/pfbid0abc' },
      { id: 'page_9876543210', permalinkUrl: null },
    ]
    const res = await request(t.app, 'POST', `/marketing/publications/${pub.id}/link-external`, {
      body: { url: 'https://www.facebook.com/pagina/posts/9876543210' },
    })
    expect(res.status).toBe(200)
    expect(((await res.json()) as PublicationView).externalPostId).toBe('page_9876543210')
  })

  it('link que não bate com nenhum post → 404 EXTERNAL_POST_NOT_FOUND', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount('instagram'))
    const pub = await publishedPublication(t, 'ig_feed')
    t.metaApi.igMediaList = [{ id: 'm1', permalink: 'https://www.instagram.com/p/AAA111/' }]
    const res = await request(t.app, 'POST', `/marketing/publications/${pub.id}/link-external`, {
      body: { url: 'https://www.instagram.com/p/NAOEXISTE/' },
    })
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('EXTERNAL_POST_NOT_FOUND')
  })

  it('publicação que ainda não foi publicada → 409; IG sem conta → 409', async () => {
    const t = buildTestApp()
    const content = await createContent(t.app)
    await completeChecklist(t.app, content)
    await request(t.app, 'POST', `/marketing/contents/${content.id}/stage`, {
      body: { to: 'approved' },
    })
    const createRes = await request(
      t.app,
      'POST',
      `/marketing/contents/${content.id}/publications`,
      { body: { formats: ['ig_feed'] } },
    )
    const [draft] = (await createRes.json()) as PublicationView[]
    const notPublished = await request(
      t.app,
      'POST',
      `/marketing/publications/${(draft as PublicationView).id}/link-external`,
      { body: { url: 'https://www.instagram.com/p/AAA111/' } },
    )
    expect(notPublished.status).toBe(409)

    const pub = await publishedPublication(t, 'ig_reels')
    const noAccount = await request(
      t.app,
      'POST',
      `/marketing/publications/${pub.id}/link-external`,
      { body: { url: 'https://www.instagram.com/reel/AAA111/' } },
    )
    expect(noAccount.status).toBe(409)
  })
})
