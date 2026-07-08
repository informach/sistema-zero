import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { Network, PublicationFormat } from '../../src/domain/publication/publication'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { MetaMetricsSource } from '../../src/infrastructure/gateways/meta/meta-metrics-source'
import { FakeMetaApi } from '../fakes/meta'

function account(network: Network): SocialAccount {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    network,
    externalId: `${network}-ext`,
    displayName: 'Conta',
    username: null,
    accessTokenEnc: 'sealed:t',
    refreshTokenEnc: null,
    tokenExpiresAt: null,
    refreshExpiresAt: null,
    scopes: [],
    status: 'connected',
    metadata: {},
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: now,
    updatedAt: now,
  }
}

function published(format: PublicationFormat, externalPostId: string): Publication {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    contentId: randomUUID(),
    socialAccountId: null,
    network: format.startsWith('ig_') ? 'instagram' : 'facebook',
    format,
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
    publishedAt: now,
    reminderSentAt: null,
    metricsLastCollectedAt: null,
    metricsNextCollectAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

describe('MetaMetricsSource', () => {
  it('instagram: fields + insights vivos viram o sample completo', async () => {
    const api = new FakeMetaApi()
    api.igAccountStats = { followers: 1234, raw: { followers_count: 1234 } }
    api.igMediaStats.set('media-1', {
      views: 400,
      reach: 350,
      likes: 40,
      comments: 4,
      shares: 6,
      saves: 9,
      raw: {},
    })
    const source = new MetaMetricsSource(api, 'instagram')
    const acct = account('instagram')

    const sample = await source.collectAccount(acct, 'token')
    expect(sample?.followers).toBe(1234)

    const pub = published('ig_feed', 'media-1')
    const map = await source.collectPublications([pub], acct, 'token')
    expect(map.get(pub.id)).toMatchObject({
      views: 400,
      likes: 40,
      comments: 4,
      shares: 6,
      saves: 9,
      reach: 350,
    })
  })

  it('facebook: SÓ fields estáveis (reactions/comments/shares) e views 0', async () => {
    const api = new FakeMetaApi()
    api.fbPageStats = { followers: 800, raw: {} }
    api.fbPostStats.set('post-1', { likes: 12, comments: 3, shares: 2, raw: {} })
    const source = new MetaMetricsSource(api, 'facebook')
    const acct = account('facebook')

    const sample = await source.collectAccount(acct, 'token')
    expect(sample?.followers).toBe(800)

    const pub = published('fb_post', 'post-1')
    const map = await source.collectPublications([pub], acct, 'token')
    expect(map.get(pub.id)).toMatchObject({ views: 0, likes: 12, comments: 3, shares: 2 })
  })

  it('post apagado (sem stats na API) fica FORA do mapa — o worker reagenda', async () => {
    const api = new FakeMetaApi()
    const source = new MetaMetricsSource(api, 'instagram')
    const pub = published('ig_feed', 'media-sumido')
    const map = await source.collectPublications([pub], account('instagram'), 'token')
    expect(map.size).toBe(0)
  })
})
