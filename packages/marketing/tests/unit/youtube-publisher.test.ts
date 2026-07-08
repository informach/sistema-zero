import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccountService } from '../../src/application/accounts/account.service'
import { ContentService } from '../../src/application/contents/content.service'
import { PublicationService } from '../../src/application/publications/publication.service'
import { YtQuotaGuard } from '../../src/application/publications/yt-quota-guard'
import type { Content } from '../../src/domain/content/content'
import type { MediaAsset } from '../../src/domain/media/media-asset'
import type { SocialPublisher } from '../../src/domain/ports/social-publisher.port'
import type { Network } from '../../src/domain/publication/publication'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { YoutubeApiError } from '../../src/infrastructure/gateways/youtube/youtube-api.port'
import { YoutubePublisher } from '../../src/infrastructure/gateways/youtube/youtube-publisher'
import { PublisherWorker } from '../../src/infrastructure/workers/publisher-worker'
import {
  FakeMediaStore,
  FakeOAuthProvider,
  FakeSecretBox,
  InMemoryChecklistRepository,
  InMemoryCommentRepository,
  InMemoryContentRepository,
  InMemoryMediaAssetRepository,
  InMemoryPublicationRepository,
  InMemorySocialAccountRepository,
} from '../fakes/in-memory'
import { FakeYoutubeApi, InMemoryQuotaUsageRepository } from '../fakes/youtube'

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

const CHUNK = 256 * 1024 // 262144 — múltiplo mínimo do protocolo
const VIDEO_BYTES = CHUNK * 3

function makeContent(): Content {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    title: 'Vídeo da semana',
    contentType: 'video_long',
    stage: 'scheduled',
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

function makeAccount(): SocialAccount {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    network: 'youtube',
    externalId: 'sub-1',
    displayName: 'Canal',
    username: null,
    accessTokenEnc: 'sealed:token',
    refreshTokenEnc: 'sealed:refresh',
    tokenExpiresAt: new Date(now.getTime() + 3600_000),
    refreshExpiresAt: null,
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ],
    status: 'connected',
    metadata: {},
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: now,
    updatedAt: now,
  }
}

function makeVideoAsset(contentId: string): MediaAsset {
  const now = new Date()
  const id = randomUUID()
  return {
    id,
    version: 0,
    contentId,
    kind: 'final',
    r2Key: `marketing/${contentId}/${id}.mp4`,
    driveFileId: null,
    filename: 'final.mp4',
    contentType: 'video/mp4',
    sizeBytes: VIDEO_BYTES,
    status: 'ready',
    transferAttempts: 0,
    transferNextAt: null,
    transferError: null,
    archivedAt: null,
    r2DeletedAt: null,
    createdBy: randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
}

function makeAutoPublication(
  contentId: string,
  accountId: string,
  /** Relógio do FIXTURE (não o real — o worker usa o clock injetado). */
  base: Date,
  overrides: Partial<Publication> = {},
): Publication {
  const now = base
  return {
    id: randomUUID(),
    version: 0,
    contentId,
    socialAccountId: accountId,
    network: 'youtube',
    format: 'yt_video',
    caption: 'Descrição do vídeo',
    title: 'Meu vídeo',
    tags: ['sistema zero'],
    coverAssetId: null,
    scheduledAt: new Date(now.getTime() + 2 * 60 * 60_000), // daqui a 2h (dentro do lead de 6h)
    publishMode: 'auto',
    status: 'scheduled',
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    providerSession: {},
    externalPostId: null,
    externalUrl: null,
    publishedAt: null,
    reminderSentAt: null,
    metricsLastCollectedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function setup(quota: { budgetUnits?: number; uploadDailyCap?: number } = {}) {
  const publications = new InMemoryPublicationRepository()
  const contents = new InMemoryContentRepository()
  publications.contentsRef = contents
  const checklist = new InMemoryChecklistRepository()
  const comments = new InMemoryCommentRepository()
  const assets = new InMemoryMediaAssetRepository()
  const accounts = new InMemorySocialAccountRepository()
  const store = new FakeMediaStore()
  const api = new FakeYoutubeApi()
  const quotaRepo = new InMemoryQuotaUsageRepository()
  let currentTime = new Date('2026-07-07T12:00:00Z')
  const now = () => currentTime

  const guard = new YtQuotaGuard(
    quotaRepo,
    { budgetUnits: quota.budgetUnits ?? 9000, uploadDailyCap: quota.uploadDailyCap ?? 20 },
    now,
  )
  const publisher = new YoutubePublisher({
    api,
    quota: guard,
    config: { chunkBytes: CHUNK, insertUnits: 1600 },
    now,
  })
  const accountService = new AccountService(
    accounts,
    { providers: new Map([['youtube', new FakeOAuthProvider()]]), secretBox: new FakeSecretBox() },
    new Set(['youtube']),
    now,
    silentLogger,
  )
  const contentService = new ContentService(
    contents,
    checklist,
    comments,
    publications,
    now,
    randomUUID,
  )
  const publicationService = new PublicationService(publications, contentService, now, randomUUID, {
    accounts,
    capableNetworks: new Set<Network>(['youtube']),
  })
  const worker = new PublisherWorker({
    publications,
    contents,
    notifier: null,
    reminder: null,
    auto: {
      publishers: new Map<Network, SocialPublisher>([['youtube', publisher]]),
      accounts,
      accountService,
      assets,
      store,
      publicationService,
    },
    now,
    logger: silentLogger,
    config: {
      intervalMs: 1000,
      batchSize: 10,
      claimLeaseMs: 10 * 60_000,
      maxAttempts: 3,
      retryBaseMs: 60_000,
      retryMaxMs: 30 * 60_000,
      autoLeadMs: 6 * 60 * 60_000,
    },
  })

  return {
    publications,
    contents,
    assets,
    accounts,
    store,
    api,
    worker,
    now,
    advance(ms: number) {
      currentTime = new Date(currentTime.getTime() + ms)
    },
  }
}

async function seedHappyPath(s: ReturnType<typeof setup>) {
  const content = makeContent()
  await s.contents.create(content)
  const account = makeAccount()
  await s.accounts.create(account)
  const video = makeVideoAsset(content.id)
  await s.assets.create(video)
  s.store.objects.set(video.r2Key as string, VIDEO_BYTES)
  const pub = makeAutoPublication(content.id, account.id, s.now())
  await s.publications.create(pub)
  return { content, account, video, pub }
}

describe('youtube-publisher via publisher-worker (ramo auto)', () => {
  it('agendada no lead: upload antecipado privado + publishAt nativo → pending; repoll pós-horário publica', async () => {
    const s = setup()
    const { content, pub } = await seedHappyPath(s)

    await s.worker.tick()

    let stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('scheduled') // pending: aguarda o publishAt nativo
    expect(stored?.providerSession.videoId).toBeTruthy()
    expect(stored?.attempts).toBe(0) // pending NÃO gasta tentativa
    expect(s.api.insertCalls).toBe(1)
    const videoId = stored?.providerSession.videoId as string
    expect(s.api.videos.get(videoId)?.privacyStatus).toBe('private')
    expect(s.api.videos.get(videoId)?.publishAt).toBe(pub.scheduledAt?.toISOString() ?? '')

    // Ainda private no horário → segue pending, sem gastar tentativa.
    s.advance(2 * 60 * 60_000 + 60_000)
    await s.worker.tick()
    stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('scheduled')
    expect(stored?.attempts).toBe(0)

    // O YouTube publica (publishAt nativo dispara) → repoll vê public → published.
    s.api.publishVideo(videoId)
    s.advance(6 * 60_000)
    await s.worker.tick()
    stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('published')
    expect(stored?.externalPostId).toBe(videoId)
    expect(stored?.externalUrl).toBe(`https://www.youtube.com/watch?v=${videoId}`)
    // Etapa derivada do conteúdo sincronizada pelo worker.
    expect(s.contents.rows.get(content.id)?.stage).toBe('published')
  })

  it('agendamento vencido → sobe público e publica DIRETO (short → /shorts/)', async () => {
    const s = setup()
    const { pub } = await seedHappyPath(s)
    const stored0 = s.publications.rows.get(pub.id)
    if (stored0) {
      stored0.format = 'yt_short'
      stored0.scheduledAt = new Date(s.now().getTime() - 60_000)
    }

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('published')
    expect(stored?.externalUrl).toContain('youtube.com/shorts/')
  })

  it('falha transitória entre chunks: retry RETOMA do offset commitado sem 2º insert', async () => {
    const s = setup()
    const { pub } = await seedHappyPath(s)
    s.api.failNextChunkWith = new YoutubeApiError('rede caiu', 'retryable')

    await s.worker.tick()
    let stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('scheduled')
    expect(stored?.attempts).toBe(1)
    expect(stored?.providerSession.uploadUri).toBeTruthy()

    s.advance(2 * 60_000) // passa o backoff
    await s.worker.tick()
    stored = s.publications.rows.get(pub.id)
    expect(stored?.providerSession.videoId).toBeTruthy()
    expect(s.api.insertCalls).toBe(1) // NUNCA recria o insert com sessão viva
  })

  it('crash entre o último chunk e o save: status-check RECUPERA o videoId (zero duplicação)', async () => {
    const s = setup()
    const { pub } = await seedHappyPath(s)
    // Sessão JÁ completa no provedor (o processo anterior morreu após o 201),
    // mas o checkpoint local só tem o uploadUri.
    const uri = s.api.seedSession({
      totalBytes: VIDEO_BYTES,
      committed: VIDEO_BYTES,
      metadata: {
        title: 'Meu vídeo',
        description: '',
        tags: [],
        privacyStatus: 'private',
        publishAt: pub.scheduledAt?.toISOString() ?? null,
      },
      completedVideoId: 'vid-recuperado',
    })
    const stored0 = s.publications.rows.get(pub.id)
    if (stored0) {
      stored0.providerSession = { provider: 'youtube', uploadUri: uri, totalBytes: VIDEO_BYTES }
    }

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.providerSession.videoId).toBe('vid-recuperado')
    expect(s.api.insertCalls).toBe(0)
  })

  it('quota esgotada → deferred p/ a virada PT, SEM gastar tentativa, com aviso visível', async () => {
    const s = setup({ budgetUnits: 100 }) // insert custa 1600 → nunca cabe
    const { pub } = await seedHappyPath(s)

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('scheduled')
    expect(stored?.attempts).toBe(0)
    expect(stored?.lastError ?? '').toContain('Quota diária do YouTube')
    expect(stored?.nextAttemptAt?.getTime() ?? 0).toBeGreaterThan(s.now().getTime())
    expect(s.api.insertCalls).toBe(0)
  })

  it('thumbnail 403 (canal sem verificação) é NÃO-fatal: publica com thumbnailError', async () => {
    const s = setup()
    const { pub, video } = await seedHappyPath(s)
    const cover: MediaAsset = {
      ...makeVideoAsset(pub.contentId),
      id: randomUUID(),
      kind: 'cover',
      contentType: 'image/png',
      sizeBytes: 1024,
      r2Key: `marketing/${pub.contentId}/capa.png`,
    }
    await s.assets.create(cover)
    s.store.objects.set(cover.r2Key as string, 1024)
    const stored0 = s.publications.rows.get(pub.id)
    if (stored0) {
      stored0.coverAssetId = cover.id
      stored0.scheduledAt = new Date(s.now().getTime() - 60_000) // publica direto
    }
    s.api.failThumbnailWith = new YoutubeApiError('canal não verificado', 'permanent')
    s.store.objects.set(video.r2Key as string, VIDEO_BYTES)

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('published')
    expect(stored?.providerSession.thumbnailError).toBeTruthy()
  })

  it('reagendamento pós-upload (fase resync): videos.update private + publishAt novo', async () => {
    const s = setup()
    const { pub } = await seedHappyPath(s)
    const videoId = 'vid-existente'
    s.api.videos.set(videoId, { privacyStatus: 'private', publishAt: '2026-07-07T14:00:00Z' })
    const newTime = new Date(s.now().getTime() + 4 * 60 * 60_000)
    const stored0 = s.publications.rows.get(pub.id)
    if (stored0) {
      stored0.providerSession = { provider: 'youtube', videoId, phase: 'resync_publish_at' }
      stored0.scheduledAt = newTime
      stored0.nextAttemptAt = new Date(s.now().getTime() - 1000)
    }

    await s.worker.tick()

    expect(s.api.updateCalls).toHaveLength(1)
    expect(s.api.updateCalls[0]?.privacyStatus).toBe('private')
    expect(s.api.updateCalls[0]?.publishAt).toBe(newTime.toISOString())
    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('scheduled')
    expect(stored?.providerSession.phase).toBe('awaiting_native_publish')
  })

  it('sem título → failed PERMANENTE com CTA de composer', async () => {
    const s = setup()
    const { pub } = await seedHappyPath(s)
    const stored0 = s.publications.rows.get(pub.id)
    if (stored0) stored0.title = null

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('failed')
    expect(stored?.lastError ?? '').toContain('título')
  })

  it('conta desconectada → failed com CTA de reconexão', async () => {
    const s = setup()
    const { pub, account } = await seedHappyPath(s)
    const acc = s.accounts.rows.get(account.id)
    if (acc) acc.status = 'needs_reauth'

    await s.worker.tick()

    const stored = s.publications.rows.get(pub.id)
    expect(stored?.status).toBe('failed')
    expect(stored?.lastError ?? '').toContain('Conexões')
  })

  it('publicação MANUAL nunca entra no ramo auto', async () => {
    const s = setup()
    const { pub } = await seedHappyPath(s)
    const stored0 = s.publications.rows.get(pub.id)
    if (stored0) stored0.publishMode = 'manual'

    await s.worker.tick()

    expect(s.api.insertCalls).toBe(0)
    expect(s.publications.rows.get(pub.id)?.status).toBe('scheduled')
  })
})
