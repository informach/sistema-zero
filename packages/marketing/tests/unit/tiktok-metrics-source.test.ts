import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { TikTokMetricsSource } from '../../src/infrastructure/gateways/tiktok/tiktok-metrics-source'
import { FakeTikTokApi } from '../fakes/tiktok'

const NOW = new Date('2026-07-08T12:00:00Z')

function account(): SocialAccount {
  return {
    id: randomUUID(),
    version: 0,
    network: 'tiktok',
    externalId: 'open-id-1',
    displayName: 'Sistema Zero',
    username: 'sistemazero',
    accessTokenEnc: 'sealed:tt',
    refreshTokenEnc: null,
    tokenExpiresAt: null,
    refreshExpiresAt: null,
    scopes: [],
    status: 'connected',
    metadata: {},
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function published(externalPostId: string): Publication {
  return {
    id: randomUUID(),
    version: 0,
    contentId: randomUUID(),
    socialAccountId: null,
    network: 'tiktok',
    format: 'tt_video',
    caption: '',
    title: null,
    tags: [],
    coverAssetId: null,
    scheduledAt: null,
    publishMode: 'auto',
    status: 'published',
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    providerSession: {},
    externalPostId,
    externalUrl: null,
    publishedAt: NOW,
    reminderSentAt: null,
    metricsLastCollectedAt: null,
    metricsNextCollectAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

describe('TikTokMetricsSource', () => {
  it('seguidores via user/info e stats por vídeo via video/query', async () => {
    const api = new FakeTikTokApi()
    api.userStats = { followers: 4321, raw: { follower_count: 4321 } }
    api.videoStats.set('vid-1', { views: 900, likes: 55, comments: 7, shares: 12, raw: {} })
    const source = new TikTokMetricsSource(api)

    const sample = await source.collectAccount(account(), 'token')
    expect(sample?.followers).toBe(4321)

    const pub = published('vid-1')
    const map = await source.collectPublications([pub], account(), 'token')
    expect(map.get(pub.id)).toMatchObject({ views: 900, likes: 55, comments: 7, shares: 12 })
  })

  it('mais de 20 vídeos são consultados em lotes de 20', async () => {
    const api = new FakeTikTokApi()
    const source = new TikTokMetricsSource(api)
    const pubs = Array.from({ length: 45 }, (_, i) => published(`vid-${i}`))
    await source.collectPublications(pubs, account(), 'token')
    expect(api.videoQueryBatches.map((b) => b.length)).toEqual([20, 20, 5])
  })

  it('vídeo apagado (sem stats) fica FORA do mapa — o decaimento reagenda', async () => {
    const api = new FakeTikTokApi()
    const source = new TikTokMetricsSource(api)
    const map = await source.collectPublications([published('sumiu')], account(), 'token')
    expect(map.size).toBe(0)
  })
})
