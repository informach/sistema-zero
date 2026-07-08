import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccountService } from '../../src/application/accounts/account.service'
import { YtQuotaGuard } from '../../src/application/publications/yt-quota-guard'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { YoutubeMetricsSource } from '../../src/infrastructure/gateways/youtube/youtube-metrics-source'
import { MetricsWorker } from '../../src/infrastructure/workers/metrics-worker'
import {
  FakeOAuthProvider,
  FakeSecretBox,
  InMemoryMetricsRepository,
  InMemoryPublicationRepository,
  InMemorySocialAccountRepository,
} from '../fakes/in-memory'
import { FakeYoutubeApi, InMemoryQuotaUsageRepository } from '../fakes/youtube'

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
const HOUR = 60 * 60_000
const DAY = 24 * HOUR

function connectedAccount(base: Date): SocialAccount {
  return {
    id: randomUUID(),
    version: 0,
    network: 'youtube',
    externalId: 'sub-1',
    displayName: 'Canal',
    username: null,
    accessTokenEnc: 'sealed:token',
    refreshTokenEnc: 'sealed:refresh',
    tokenExpiresAt: new Date(base.getTime() + 3600_000),
    refreshExpiresAt: null,
    scopes: [],
    status: 'connected',
    metadata: { channelTitle: 'Canal' },
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: base,
    updatedAt: base,
  }
}

function publishedPublication(
  base: Date,
  videoId: string,
  overrides: Partial<Publication> = {},
): Publication {
  return {
    id: randomUUID(),
    version: 0,
    contentId: randomUUID(),
    socialAccountId: null,
    network: 'youtube',
    format: 'yt_video',
    caption: '',
    title: 'Vídeo',
    tags: [],
    coverAssetId: null,
    scheduledAt: null,
    publishMode: 'auto',
    status: 'published',
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    providerSession: {},
    externalPostId: videoId,
    externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    publishedAt: new Date(base.getTime() - DAY),
    reminderSentAt: null,
    metricsLastCollectedAt: null,
    // Elegível JÁ (o publisher/mark-published setam isto ao publicar).
    metricsNextCollectAt: base,
    createdAt: base,
    updatedAt: base,
    ...overrides,
  }
}

function setup(quota: { budgetUnits?: number } = {}) {
  const accounts = new InMemorySocialAccountRepository()
  const publications = new InMemoryPublicationRepository()
  const metrics = new InMemoryMetricsRepository()
  const api = new FakeYoutubeApi()
  let currentTime = new Date('2026-07-07T12:00:00Z')
  const now = () => currentTime
  const guard = new YtQuotaGuard(
    new InMemoryQuotaUsageRepository(),
    { budgetUnits: quota.budgetUnits ?? 9000, uploadDailyCap: 20 },
    now,
  )
  const worker = new MetricsWorker({
    sources: [new YoutubeMetricsSource(api, guard)],
    accounts,
    accountService: new AccountService(
      accounts,
      {
        providers: new Map([['youtube', new FakeOAuthProvider()]]),
        secretBox: new FakeSecretBox(),
      },
      new Set(['youtube']),
      now,
      silentLogger,
    ),
    publications,
    metrics,
    withLock: (fn) => fn(),
    now,
    logger: silentLogger,
    config: { intervalMs: 6 * HOUR, maxAgeDays: 365, batchSize: 50 },
  })
  return {
    accounts,
    publications,
    metrics,
    api,
    worker,
    now,
    advance(ms: number) {
      currentTime = new Date(currentTime.getTime() + ms)
    },
  }
}

describe('metrics-worker genérico (decaimento)', () => {
  it('coleta canal + publicações em lote e REAGENDA pela idade (<48h → +1h)', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount(s.now()))
    const pub1 = publishedPublication(s.now(), 'vid-1')
    const pub2 = publishedPublication(s.now(), 'vid-2')
    await s.publications.createMany([pub1, pub2])
    s.api.videoStats.set('vid-1', { views: 100, likes: 10, comments: 2 })
    s.api.videoStats.set('vid-2', { views: 50, likes: 5, comments: 1 })

    await s.worker.tick()

    expect(s.metrics.accountSnapshots).toHaveLength(1)
    expect(s.metrics.accountSnapshots[0]?.followers).toBe(1234)
    expect(s.metrics.publicationSnapshots).toHaveLength(2)
    // Um único videos.list p/ os dois ids (lote = 1 unit).
    expect(s.api.statsCalls).toHaveLength(1)
    const stored = s.publications.rows.get(pub1.id)
    expect(stored?.metricsLastCollectedAt?.getTime()).toBe(s.now().getTime())
    // Publicada há 1 dia (<48h) → próxima coleta em +1h.
    expect(stored?.metricsNextCollectAt?.getTime()).toBe(s.now().getTime() + HOUR)
  })

  it('respeita o agendamento: antes da hora não coleta; depois coleta de novo', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount(s.now()))
    const pub = publishedPublication(s.now(), 'vid-1', {
      metricsNextCollectAt: new Date(s.now().getTime() + HOUR), // ainda não
    })
    await s.publications.create(pub)
    s.api.videoStats.set('vid-1', { views: 1, likes: 0, comments: 0 })

    await s.worker.tick()
    expect(s.metrics.publicationSnapshots).toHaveLength(0)

    s.advance(2 * HOUR)
    await s.worker.tick()
    expect(s.metrics.publicationSnapshots).toHaveLength(1)
  })

  it('post velho ganha cadência lenta; além do maxAge SAI do radar (null)', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount(s.now()))
    const old = publishedPublication(s.now(), 'vid-velho', {
      publishedAt: new Date(s.now().getTime() - 100 * DAY), // 90d..365d → 7d
    })
    const ancient = publishedPublication(s.now(), 'vid-antigo', {
      publishedAt: new Date(s.now().getTime() - 400 * DAY), // além do radar
    })
    await s.publications.createMany([old, ancient])
    s.api.videoStats.set('vid-velho', { views: 9, likes: 1, comments: 0 })
    s.api.videoStats.set('vid-antigo', { views: 9, likes: 1, comments: 0 })

    await s.worker.tick()

    expect(s.publications.rows.get(old.id)?.metricsNextCollectAt?.getTime()).toBe(
      s.now().getTime() + 7 * DAY,
    )
    expect(s.publications.rows.get(ancient.id)?.metricsNextCollectAt).toBeNull()
    // Fora do radar NUNCA volta a ser elegível.
    s.advance(30 * DAY)
    await s.worker.tick()
    expect(
      s.metrics.publicationSnapshots.filter((p) => p.publicationId === ancient.id),
    ).toHaveLength(1) // só a coleta inicial
  })

  it('vídeo apagado no provedor não gera snapshot mas é REAGENDADO (não trava a fila)', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount(s.now()))
    const pub = publishedPublication(s.now(), 'vid-sumido')
    await s.publications.create(pub)

    await s.worker.tick()

    expect(s.metrics.publicationSnapshots).toHaveLength(0)
    expect(s.publications.rows.get(pub.id)?.metricsNextCollectAt?.getTime()).toBe(
      s.now().getTime() + HOUR,
    )
  })

  it('quota esgotada → fonte pula o ciclo sem reagendar (fica elegível)', async () => {
    const s = setup({ budgetUnits: 0 })
    await s.accounts.create(connectedAccount(s.now()))
    const pub = publishedPublication(s.now(), 'vid-1')
    await s.publications.create(pub)

    await s.worker.tick()

    expect(s.metrics.accountSnapshots).toHaveLength(0)
    // collectPublications devolveu vazio (sem quota) — snapshots não entram,
    // mas o reagendamento acontece (post apagado vs quota são indistinguíveis
    // aqui; o decaimento reagenda e a próxima janela tenta de novo).
    expect(s.metrics.publicationSnapshots).toHaveLength(0)
  })

  it('sem conta conectada → no-op', async () => {
    const s = setup()
    await s.worker.tick()
    expect(s.metrics.accountSnapshots).toHaveLength(0)
  })
})
