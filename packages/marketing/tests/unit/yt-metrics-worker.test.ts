import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccountService } from '../../src/application/accounts/account.service'
import { YtQuotaGuard } from '../../src/application/publications/yt-quota-guard'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { YtMetricsWorker } from '../../src/infrastructure/workers/yt-metrics-worker'
import {
  FakeOAuthProvider,
  FakeSecretBox,
  InMemoryMetricsRepository,
  InMemoryPublicationRepository,
  InMemorySocialAccountRepository,
} from '../fakes/in-memory'
import { FakeYoutubeApi, InMemoryQuotaUsageRepository } from '../fakes/youtube'

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

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

function publishedPublication(base: Date, videoId: string): Publication {
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
    publishedAt: new Date(base.getTime() - 86_400_000),
    reminderSentAt: null,
    metricsLastCollectedAt: null,
    createdAt: base,
    updatedAt: base,
  }
}

function setup() {
  const accounts = new InMemorySocialAccountRepository()
  const publications = new InMemoryPublicationRepository()
  const metrics = new InMemoryMetricsRepository()
  const api = new FakeYoutubeApi()
  let currentTime = new Date('2026-07-07T12:00:00Z')
  const now = () => currentTime
  const worker = new YtMetricsWorker({
    api,
    accounts,
    accountService: new AccountService(
      accounts,
      { provider: new FakeOAuthProvider(), secretBox: new FakeSecretBox() },
      new Set(['youtube']),
      now,
      silentLogger,
    ),
    publications,
    metrics,
    quota: new YtQuotaGuard(
      new InMemoryQuotaUsageRepository(),
      { budgetUnits: 9000, uploadDailyCap: 20 },
      now,
    ),
    withLock: (fn) => fn(),
    now,
    logger: silentLogger,
    config: { intervalMs: 6 * 60 * 60_000, maxAgeDays: 90 },
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

describe('yt-metrics-worker (snapshots básicos)', () => {
  it('coleta canal + publicações em lote (append-only) e marca a coleta', async () => {
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
    // Um único videos.list p/ os dois ids (lote de 50 = 1 unit).
    expect(s.api.statsCalls).toHaveLength(1)
    expect(s.api.statsCalls[0]).toHaveLength(2)
    expect(s.publications.rows.get(pub1.id)?.metricsLastCollectedAt).not.toBeNull()
  })

  it('respeita metricsLastCollectedAt: coleta recente não repete', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount(s.now()))
    const pub = publishedPublication(s.now(), 'vid-1')
    pub.metricsLastCollectedAt = new Date(s.now().getTime() - 60_000) // há 1min
    await s.publications.create(pub)

    await s.worker.tick()

    expect(s.metrics.publicationSnapshots).toHaveLength(0)
    // Vencendo o intervalo, volta a coletar.
    s.advance(7 * 60 * 60_000)
    s.api.videoStats.set('vid-1', { views: 1, likes: 0, comments: 0 })
    await s.worker.tick()
    expect(s.metrics.publicationSnapshots).toHaveLength(1)
  })

  it('vídeo apagado no provedor não gera snapshot mas SAI do radar', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount(s.now()))
    const pub = publishedPublication(s.now(), 'vid-sumido')
    await s.publications.create(pub)

    await s.worker.tick()

    expect(s.metrics.publicationSnapshots).toHaveLength(0)
    expect(s.publications.rows.get(pub.id)?.metricsLastCollectedAt).not.toBeNull()
  })

  it('sem conta conectada → no-op', async () => {
    const s = setup()
    await s.worker.tick()
    expect(s.metrics.accountSnapshots).toHaveLength(0)
  })
})
