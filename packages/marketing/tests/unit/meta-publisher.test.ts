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
  orderedAssetIds: string[] = [],
): PublishInput & { session: Record<string, unknown> } {
  const network = publication.network as 'instagram' | 'facebook'
  const state = { session: { ...session } }
  return {
    publication,
    account: makeAccount(network),
    accessToken: 'page-token',
    assets,
    orderedAssetIds,
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

describe('MetaPublisher — carrossel do IG (filhos na ordem de publication_assets)', () => {
  function carouselSetup(count: number) {
    const assets = Array.from({ length: count }, () => makeAsset())
    const orderedIds = assets.map((a) => a.id)
    return { assets, orderedIds }
  }

  it('3 imagens: 3 filhos na ordem + pai CAROUSEL com children CSV → published', async () => {
    const api = new FakeMetaApi()
    const { assets, orderedIds } = carouselSetup(3)
    const input = makeInput(makePublication('ig_carousel'), assets, {}, orderedIds)
    const outcome = await publisher('instagram', api).publish(input)
    expect(outcome.kind).toBe('published')
    expect(api.createCalls).toHaveLength(4)
    const children = api.createCalls.slice(0, 3)
    expect(children.every((c) => c.params.is_carousel_item === 'true')).toBe(true)
    // A ordem dos filhos segue a ordem dos assets da publicação.
    expect(children.map((c) => c.params.image_url)).toEqual(
      orderedIds.map((id) => `https://r2.example/signed/${id}`),
    )
    const parent = api.createCalls[3]
    expect(parent?.params.media_type).toBe('CAROUSEL')
    expect(parent?.params.children).toBe('container-1,container-2,container-3')
    expect(input.session.childContainerIds).toEqual(['container-1', 'container-2', 'container-3'])
  })

  it('retomada por ÍNDICE: filho já criado não é recriado no retry', async () => {
    const api = new FakeMetaApi()
    const { assets, orderedIds } = carouselSetup(3)
    const input = makeInput(
      makePublication('ig_carousel'),
      assets,
      { provider: 'meta', childContainerIds: ['filho-salvo'] },
      orderedIds,
    )
    const outcome = await publisher('instagram', api).publish(input)
    expect(outcome.kind).toBe('published')
    // Só os 2 filhos que faltavam + o pai (o 1º veio do checkpoint).
    expect(api.createCalls).toHaveLength(3)
    expect(api.createCalls[2]?.params.children).toBe('filho-salvo,container-1,container-2')
  })

  it('menos de 2 imagens selecionadas → permanent com CTA do composer', async () => {
    const api = new FakeMetaApi()
    const { assets, orderedIds } = carouselSetup(1)
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_carousel'), assets, {}, orderedIds),
    )
    expect(outcome.kind).toBe('permanent')
    if (outcome.kind === 'permanent') expect(outcome.reason).toContain('2 a 10')
    expect(api.createCalls).toHaveLength(0)
  })

  it('PNG no meio da lista → permanent apontando o ARQUIVO culpado', async () => {
    const api = new FakeMetaApi()
    const jpeg = makeAsset()
    const png = makeAsset({ contentType: 'image/png', filename: 'capa.png' })
    const outcome = await publisher('instagram', api).publish(
      makeInput(makePublication('ig_carousel'), [jpeg, png], {}, [jpeg.id, png.id]),
    )
    expect(outcome.kind).toBe('permanent')
    if (outcome.kind === 'permanent') expect(outcome.reason).toContain('capa.png')
  })

  it('container EXPIRED derruba o pai E os filhos (recomeça do zero)', async () => {
    const api = new FakeMetaApi()
    api.statusScript.set('pai-velho', ['EXPIRED'])
    const { assets, orderedIds } = carouselSetup(2)
    const input = makeInput(
      makePublication('ig_carousel'),
      assets,
      { containerId: 'pai-velho', childContainerIds: ['a', 'b'] },
      orderedIds,
    )
    const outcome = await publisher('instagram', api).publish(input)
    expect(outcome.kind).toBe('retryable')
    expect(input.session.containerId).toBeNull()
    expect(input.session.childContainerIds).toEqual([])
  })
})

describe('MetaPublisher — Reels do FB (start → upload → finish consultável)', () => {
  const reelVideo = () => makeAsset({ contentType: 'video/mp4', filename: 'reel.mp4' })

  it('vencido: start → upload por file_url → finish → poll complete → published', async () => {
    const api = new FakeMetaApi()
    const input = makeInput(makePublication('fb_reels'), [reelVideo()])
    const pub = publisher('facebook', api)

    // 1º ciclo: sobe e dispara o finish; o poll fica p/ o próximo ciclo.
    const first = await pub.publish(input)
    expect(first.kind).toBe('pending')
    expect(api.reelStartCalls).toBe(1)
    expect(api.reelUploadCalls).toHaveLength(1)
    expect(api.reelFinishCalls).toHaveLength(1)

    // 2º ciclo: fase de publicação completa → published com URL de reel.
    const second = await pub.publish(input)
    expect(second.kind).toBe('published')
    if (second.kind === 'published') {
      expect(second.externalUrl).toBe(`https://www.facebook.com/reel/${second.externalPostId}`)
    }
    expect(api.reelStartCalls).toBe(1) // sessão nunca recriada
  })

  it('agendado: upload ANTECIPADO no lead, finish segura até a hora', async () => {
    const api = new FakeMetaApi()
    const scheduledAt = new Date(NOW.getTime() + 8 * 60_000)
    const input = makeInput(makePublication('fb_reels', { scheduledAt }), [reelVideo()])
    const outcome = await publisher('facebook', api).publish(input)
    expect(outcome).toEqual({ kind: 'pending', repollAt: scheduledAt })
    expect(api.reelUploadCalls).toHaveLength(1) // vídeo JÁ subiu
    expect(api.reelFinishCalls).toHaveLength(0) // publicação espera a hora
  })

  it('retry com upload feito não repete start/upload; finish idempotente por status', async () => {
    const api = new FakeMetaApi()
    const input = makeInput(makePublication('fb_reels'), [reelVideo()], {
      provider: 'meta',
      videoId: 'reel-salvo',
      uploadUrl: 'https://rupload.example/x',
      phase: 'fb_reel_uploaded',
    })
    const outcome = await publisher('facebook', api).publish(input)
    expect(outcome.kind).toBe('pending')
    expect(api.reelStartCalls).toBe(0)
    expect(api.reelUploadCalls).toHaveLength(0)
    expect(api.reelFinishCalls.map((c) => c.videoId)).toEqual(['reel-salvo'])
  })

  it('crash pós-finish: o status consultável resolve SEM repetir o finish', async () => {
    const api = new FakeMetaApi()
    api.reelStatusScript.set('reel-salvo', ['complete'])
    const input = makeInput(makePublication('fb_reels'), [reelVideo()], {
      provider: 'meta',
      videoId: 'reel-salvo',
      uploadUrl: 'https://rupload.example/x',
      phase: 'fb_reel_finishing',
    })
    const outcome = await publisher('facebook', api).publish(input)
    expect(outcome.kind).toBe('published')
    expect(api.reelFinishCalls).toHaveLength(0)
  })

  it('vídeo que não é MP4/MOV → permanent antes de qualquer side-effect', async () => {
    const api = new FakeMetaApi()
    const outcome = await publisher('facebook', api).publish(
      makeInput(makePublication('fb_reels'), [
        makeAsset({ contentType: 'video/webm', filename: 'reel.webm' }),
      ]),
    )
    expect(outcome.kind).toBe('permanent')
    expect(api.reelStartCalls).toBe(0)
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
