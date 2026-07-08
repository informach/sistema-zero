import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { MediaAsset } from '../../src/domain/media/media-asset'
import type { PublishInput } from '../../src/domain/ports/social-publisher.port'
import type { PublicationFormat } from '../../src/domain/publication/publication'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { MetaApiError } from '../../src/infrastructure/gateways/meta/meta-api.port'
import { MetaPublisher } from '../../src/infrastructure/gateways/meta/meta-publisher'
import { InMemoryPublicationRepository } from '../fakes/in-memory'
import { FakeMetaApi } from '../fakes/meta'

const NOW = new Date('2026-07-07T12:00:00Z')

function makeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  const id = randomUUID()
  return {
    id,
    version: 0,
    contentId: randomUUID(),
    kind: 'final',
    r2Key: `marketing/x/${id}.jpg`,
    driveFileId: null,
    filename: 'arte.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1024,
    status: 'ready',
    transferAttempts: 0,
    transferNextAt: null,
    transferError: null,
    archivedAt: null,
    r2DeletedAt: null,
    createdBy: randomUUID(),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function makePublication(
  format: PublicationFormat,
  overrides: Partial<Publication> = {},
): Publication {
  return {
    id: randomUUID(),
    version: 0,
    contentId: randomUUID(),
    socialAccountId: randomUUID(),
    network: format.startsWith('ig_') ? 'instagram' : 'facebook',
    format,
    caption: 'Legenda do post',
    title: null,
    tags: [],
    coverAssetId: null,
    scheduledAt: new Date(NOW.getTime() - 60_000), // vencida (due)
    publishMode: 'auto',
    status: 'publishing',
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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function makeAccount(network: 'instagram' | 'facebook'): SocialAccount {
  return {
    id: randomUUID(),
    version: 0,
    network,
    externalId: network === 'instagram' ? 'ig-1' : 'page-1',
    displayName: network === 'instagram' ? 'sistemazero' : 'Página',
    username: null,
    accessTokenEnc: 'sealed:page-token',
    refreshTokenEnc: 'sealed:user-token',
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

function makeInput(
  publication: Publication,
  assets: MediaAsset[],
  session: Record<string, unknown> = {},
): PublishInput & { session: Record<string, unknown> } {
  const network = publication.network as 'instagram' | 'facebook'
  const state = { session: { ...session } }
  return {
    publication,
    account: makeAccount(network),
    accessToken: 'page-token',
    assets,
    assetBytes: () => Promise.reject(new Error('não usado pela Meta')),
    assetUrl: async (asset) => `https://r2.example/signed/${asset.id}`,
    get session() {
      return state.session
    },
    saveSession: async (patch) => {
      state.session = { ...state.session, ...patch }
    },
  }
}

function publisher(network: 'instagram' | 'facebook', api: FakeMetaApi): MetaPublisher {
  return new MetaPublisher({
    api,
    network,
    config: { presignTtlSeconds: 3600 },
    now: () => NOW,
  })
}

describe('MetaPublisher — Instagram (container → poll → publish)', () => {
  it('ig_feed JPEG vencido: container → FINISHED → publish → published com permalink', async () => {
    const api = new FakeMetaApi()
    const input = makeInput(makePublication('ig_feed'), [makeAsset()])
    const outcome = await publisher('instagram', api).publish(input)
    expect(outcome).toEqual({
      kind: 'published',
      externalPostId: 'media-container-1',
      externalUrl: 'https://www.instagram.com/p/ABC123/',
    })
    expect(api.createCalls).toHaveLength(1)
    expect(api.createCalls[0]?.params.image_url).toContain('https://r2.example/signed/')
    expect(input.session.containerId).toBe('container-1')
    expect(input.session.publishedMediaId).toBe('media-container-1')
  })

  it('retry com containerId salvo NÃO cria 2º container (idempotência)', async () => {
    const api = new FakeMetaApi()
    api.statusScript.set('container-salvo', ['FINISHED'])
    const input = makeInput(makePublication('ig_feed'), [makeAsset()], {
      provider: 'meta',
      containerId: 'container-salvo',
    })
    const outcome = await publisher('instagram', api).publish(input)
    expect(outcome.kind).toBe('published')
    expect(api.createCalls).toHaveLength(0)
    expect(api.publishCalls).toEqual(['container-salvo'])
  })

  it('IN_PROGRESS → pending (repoll SEM publish, sem gastar tentativa)', async () => {
    const api = new FakeMetaApi()
    api.statusScript.set('container-1', ['IN_PROGRESS'])
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_reels'), [
        makeAsset({ contentType: 'video/mp4', filename: 'reel.mp4' }),
      ]),
    )
    expect(outcome.kind).toBe('pending')
    expect(api.publishCalls).toHaveLength(0)
  })

  it('FINISHED antes da hora agendada: segura o publish até o horário', async () => {
    const api = new FakeMetaApi()
    const scheduledAt = new Date(NOW.getTime() + 8 * 60_000) // lead de 10min
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_feed', { scheduledAt }), [makeAsset()]),
    )
    expect(outcome).toEqual({ kind: 'pending', repollAt: scheduledAt })
    expect(api.publishCalls).toHaveLength(0)
  })

  it('EXPIRED limpa o checkpoint e vira retryable (container refeito depois)', async () => {
    const api = new FakeMetaApi()
    api.statusScript.set('container-velho', ['EXPIRED'])
    const input = makeInput(makePublication('ig_feed'), [makeAsset()], {
      containerId: 'container-velho',
    })
    const outcome = await publisher('instagram', api).publish(input)
    expect(outcome.kind).toBe('retryable')
    expect(input.session.containerId).toBeNull()
  })

  it('limite de publicações (rate) → deferred +1h', async () => {
    const api = new FakeMetaApi()
    api.failCreateWith = new MetaApiError('limite', 'rate')
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_feed'), [makeAsset()]),
    )
    expect(outcome.kind).toBe('deferred')
    if (outcome.kind === 'deferred') {
      expect(outcome.nextAttemptAt.getTime()).toBe(NOW.getTime() + 60 * 60_000)
    }
  })

  it('PNG no ig_feed → permanent com CTA de conversão (sem gastar side-effect)', async () => {
    const api = new FakeMetaApi()
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_feed'), [
        makeAsset({ contentType: 'image/png', filename: 'arte.png' }),
      ]),
    )
    expect(outcome.kind).toBe('permanent')
    if (outcome.kind === 'permanent') expect(outcome.reason).toContain('JPEG')
    expect(api.createCalls).toHaveLength(0)
  })

  it('token inválido (190) → permanent orientando reconectar', async () => {
    const api = new FakeMetaApi()
    api.failCreateWith = new MetaApiError('token expirado', 'token')
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_feed'), [makeAsset()]),
    )
    expect(outcome.kind).toBe('permanent')
    if (outcome.kind === 'permanent') expect(outcome.reason).toContain('Conexões')
  })

  it('crash entre publish e checkpoint (PUBLISHED sem media id) → falha HONESTA', async () => {
    const api = new FakeMetaApi()
    api.statusScript.set('container-pub', ['PUBLISHED'])
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_feed'), [makeAsset()], {
        containerId: 'container-pub',
        phase: 'ig_publishing',
      }),
    )
    expect(outcome.kind).toBe('permanent')
    if (outcome.kind === 'permanent') expect(outcome.reason).toContain('Vincular post real')
    expect(api.publishCalls).toHaveLength(0)
  })

  it('publishedMediaId no checkpoint → published direto (retry pós-publish)', async () => {
    const api = new FakeMetaApi()
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_feed'), [makeAsset()], { publishedMediaId: 'media-9' }),
    )
    expect(outcome.kind).toBe('published')
    if (outcome.kind === 'published') expect(outcome.externalPostId).toBe('media-9')
    expect(api.createCalls).toHaveLength(0)
    expect(api.publishCalls).toHaveLength(0)
  })
})

describe('MetaPublisher — Facebook (post direto na hora)', () => {
  it('fb_post com foto: posta com a legenda e devolve o id do post', async () => {
    const api = new FakeMetaApi()
    const input = makeInput(makePublication('fb_post'), [makeAsset()])
    const outcome = await publisher('facebook', api).publish(input)
    expect(outcome.kind).toBe('published')
    if (outcome.kind === 'published') {
      expect(outcome.externalUrl).toBe(`https://www.facebook.com/${outcome.externalPostId}`)
    }
    expect(api.fbPhotoCalls).toHaveLength(1)
    expect(api.fbPhotoCalls[0]?.caption).toBe('Legenda do post')
    expect(input.session.publishedMediaId).toBeTruthy()
  })

  it('fb_post com vídeo final (sem imagem) usa /videos por file_url', async () => {
    const api = new FakeMetaApi()
    const outcome = await publisher('facebook', api).publish(
      makeInput(makePublication('fb_post'), [
        makeAsset({ contentType: 'video/mp4', filename: 'video.mp4' }),
      ]),
    )
    expect(outcome.kind).toBe('published')
    expect(api.fbVideoCalls).toHaveLength(1)
  })

  it('agendada no futuro NÃO cria side-effect: pending até a hora', async () => {
    const api = new FakeMetaApi()
    const scheduledAt = new Date(NOW.getTime() + 8 * 60_000)
    const outcome = await publisher('facebook', api).publish(
      makeInput(makePublication('fb_post', { scheduledAt }), [makeAsset()]),
    )
    expect(outcome).toEqual({ kind: 'pending', repollAt: scheduledAt })
    expect(api.fbPhotoCalls).toHaveLength(0)
  })

  it('fb_post sem mídia pronta → permanent orientando o modo lembrete', async () => {
    const api = new FakeMetaApi()
    const outcome = await publisher('facebook', api).publish(
      makeInput(makePublication('fb_post'), []),
    )
    expect(outcome.kind).toBe('permanent')
    if (outcome.kind === 'permanent') expect(outcome.reason).toContain('modo lembrete')
  })

  it('retry ambíguo (crash entre create e checkpoint) NUNCA re-posta', async () => {
    const api = new FakeMetaApi()
    const outcome = await publisher('facebook', api).publish(
      makeInput(makePublication('fb_post'), [makeAsset()], {
        provider: 'meta',
        phase: 'fb_creating',
      }),
    )
    expect(outcome.kind).toBe('permanent')
    if (outcome.kind === 'permanent') expect(outcome.reason).toContain('Vincular post real')
    expect(api.fbPhotoCalls).toHaveLength(0)
  })
})

describe('claim do ramo auto com lead POR REDE', () => {
  it('YouTube entra horas antes; a Meta só dentro do lead curto (10min)', async () => {
    const repo = new InMemoryPublicationRepository()
    const in2h = new Date(NOW.getTime() + 2 * 60 * 60_000)
    const yt = makePublication('yt_video', {
      network: 'youtube',
      status: 'scheduled',
      scheduledAt: in2h,
    })
    const igLonge = makePublication('ig_feed', { status: 'scheduled', scheduledAt: in2h })
    const igPerto = makePublication('ig_feed', {
      status: 'scheduled',
      scheduledAt: new Date(NOW.getTime() + 5 * 60_000),
    })
    await repo.create(yt)
    await repo.create(igLonge)
    await repo.create(igPerto)

    const claimed = await repo.claimDueAutoPublish({
      now: NOW,
      limit: 10,
      leaseMs: 60_000,
      maxAttempts: 3,
      networks: [
        { network: 'youtube', leadMs: 6 * 60 * 60_000 },
        { network: 'instagram', leadMs: 10 * 60_000 },
      ],
    })
    expect(claimed.map((p) => p.id).sort()).toEqual([yt.id, igPerto.id].sort())
  })
})
