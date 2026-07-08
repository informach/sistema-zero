import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { MediaAsset } from '../../src/domain/media/media-asset'
import type { PublishInput } from '../../src/domain/ports/social-publisher.port'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { TikTokApiError } from '../../src/infrastructure/gateways/tiktok/tiktok-api.port'
import {
  chunkPlan,
  TikTokPublisher,
} from '../../src/infrastructure/gateways/tiktok/tiktok-publisher'
import { FakeTikTokApi } from '../fakes/tiktok'

const NOW = new Date('2026-07-08T12:00:00Z')
const MB = 1024 * 1024

function makeVideo(overrides: Partial<MediaAsset> = {}): MediaAsset {
  const id = randomUUID()
  return {
    id,
    version: 0,
    contentId: randomUUID(),
    kind: 'final',
    r2Key: `marketing/x/${id}.mp4`,
    driveFileId: null,
    filename: 'video.mp4',
    contentType: 'video/mp4',
    sizeBytes: 3 * MB, // <5MB → sobe inteiro
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

function makePublication(overrides: Partial<Publication> = {}): Publication {
  return {
    id: randomUUID(),
    version: 0,
    contentId: randomUUID(),
    socialAccountId: randomUUID(),
    network: 'tiktok',
    format: 'tt_video',
    caption: 'Legenda do TikTok',
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

function makeAccount(): SocialAccount {
  return {
    id: randomUUID(),
    version: 0,
    network: 'tiktok',
    externalId: 'open-id-1',
    displayName: 'Sistema Zero',
    username: 'sistemazero',
    accessTokenEnc: 'sealed:tt',
    refreshTokenEnc: 'sealed:tt-r',
    tokenExpiresAt: new Date(NOW.getTime() + 3600_000),
    refreshExpiresAt: null,
    scopes: ['video.publish'],
    status: 'connected',
    metadata: { username: 'sistemazero' },
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
  const state = { session: { ...session } }
  return {
    publication,
    account: makeAccount(),
    accessToken: 'tt-token',
    assets,
    orderedAssetIds: [],
    assetBytes: async (_asset, start, endInclusive) => new Uint8Array(endInclusive - start + 1),
    assetUrl: () => Promise.reject(new Error('não usado pelo TikTok')),
    get session() {
      return state.session
    },
    saveSession: async (patch) => {
      state.session = { ...state.session, ...patch }
    },
  }
}

function publisher(api: FakeTikTokApi, chunkBytes = 16 * MB): TikTokPublisher {
  return new TikTokPublisher({ api, config: { chunkBytes }, now: () => NOW })
}

describe('chunkPlan (regras do FILE_UPLOAD)', () => {
  it('<5MB sobe inteiro; grande usa o chunk clampado com resto no último', () => {
    expect(chunkPlan(3 * MB, 16 * MB)).toEqual({ chunkSize: 3 * MB, totalChunkCount: 1 })
    // 40MB com chunk de 16MB → 2 chunks (floor), o último leva 24MB.
    expect(chunkPlan(40 * MB, 16 * MB)).toEqual({ chunkSize: 16 * MB, totalChunkCount: 2 })
    // Preferido abaixo do mínimo é clampado p/ 5MB.
    expect(chunkPlan(20 * MB, 1 * MB)).toEqual({ chunkSize: 5 * MB, totalChunkCount: 4 })
    // Preferido acima do máximo é clampado p/ 64MB.
    expect(chunkPlan(200 * MB, 100 * MB).chunkSize).toBe(64 * MB)
  })
})

describe('TikTokPublisher — Direct Post', () => {
  it('vencido: creator_info → init → upload inteiro → poll → published com URL @username', async () => {
    const api = new FakeTikTokApi()
    const input = makeInput(makePublication(), [makeVideo()])
    const outcome = await publisher(api).publish(input)
    expect(api.creatorInfoCalls).toBe(1)
    expect(api.initCalls[0]).toMatchObject({
      privacyLevel: 'PUBLIC_TO_EVERYONE',
      videoSize: 3 * MB,
      chunkSize: 3 * MB,
      totalChunkCount: 1,
    })
    expect(api.uploadCalls).toHaveLength(1)
    expect(outcome.kind).toBe('published')
    if (outcome.kind === 'published') {
      expect(outcome.externalUrl).toBe(
        `https://www.tiktok.com/@sistemazero/video/${outcome.externalPostId}`,
      )
    }
    expect(input.session.publishId).toBeTruthy()
  })

  it('agendado no futuro NÃO cria side-effect: pending até a hora', async () => {
    const api = new FakeTikTokApi()
    const scheduledAt = new Date(NOW.getTime() + 5 * 60_000)
    const outcome = await publisher(api).publish(
      makeInput(makePublication({ scheduledAt }), [makeVideo()]),
    )
    expect(outcome).toEqual({ kind: 'pending', repollAt: scheduledAt })
    expect(api.creatorInfoCalls).toBe(0)
    expect(api.initCalls).toHaveLength(0)
  })

  it('app sem auditoria (sem PUBLIC nas options) → posta SELF_ONLY com aviso na sessão', async () => {
    const api = new FakeTikTokApi()
    api.creatorInfo = { privacyLevelOptions: ['SELF_ONLY'], maxVideoPostDurationSec: 600 }
    const input = makeInput(makePublication(), [makeVideo()])
    const outcome = await publisher(api).publish(input)
    expect(outcome.kind).toBe('published')
    expect(api.initCalls[0]?.privacyLevel).toBe('SELF_ONLY')
    expect(String(input.session.privacyNote)).toContain('PRIVADO')
  })

  it('vídeo grande sobe em chunks (último leva o resto) e processa até completar', async () => {
    const api = new FakeTikTokApi()
    const video = makeVideo({ sizeBytes: 40 * MB })
    const input = makeInput(makePublication(), [video])
    api.statusScript.set('publish-1', [
      { status: 'PROCESSING_UPLOAD' },
      { status: 'PUBLISH_COMPLETE', postIds: ['777'] },
    ])
    const first = await publisher(api).publish(input)
    // 2 chunks: 16MB + 24MB (resto fundido no último).
    expect(api.uploadCalls.map((c) => c.byteLength)).toEqual([16 * MB, 24 * MB])
    expect(first.kind).toBe('pending') // ainda PROCESSING_UPLOAD no 1º poll
    expect(input.session.phase).toBe('processing')

    const second = await publisher(api).publish(input)
    expect(second.kind).toBe('published')
    if (second.kind === 'published') expect(second.externalPostId).toBe('777')
    expect(api.initCalls).toHaveLength(1) // init NUNCA repetido
  })

  it('retry no meio do upload RETOMA de uploaded_bytes (sem re-init)', async () => {
    const api = new FakeTikTokApi()
    const video = makeVideo({ sizeBytes: 40 * MB })
    api.statusScript.set('publish-salvo', [
      { status: 'PROCESSING_UPLOAD', uploadedBytes: 16 * MB },
      { status: 'PUBLISH_COMPLETE', postIds: ['888'] },
    ])
    const input = makeInput(makePublication(), [video], {
      provider: 'tiktok',
      phase: 'uploading',
      publishId: 'publish-salvo',
      uploadUrl: 'https://upload.tiktok.example/publish-salvo',
      chunkSize: 16 * MB,
      totalBytes: 40 * MB,
    })
    const outcome = await publisher(api).publish(input)
    expect(api.initCalls).toHaveLength(0)
    // Só o chunk final (24MB a partir do offset 16MB).
    expect(api.uploadCalls).toEqual([
      {
        start: 16 * MB,
        byteLength: 24 * MB,
        uploadUrl: 'https://upload.tiktok.example/publish-salvo',
      },
    ])
    expect(outcome.kind).toBe('published')
  })

  it('uploaded_bytes desalinhado do chunk → limpa a sessão e recomeça (retryable)', async () => {
    const api = new FakeTikTokApi()
    api.statusScript.set('publish-torto', [{ status: 'PROCESSING_UPLOAD', uploadedBytes: 7 * MB }])
    const input = makeInput(makePublication(), [makeVideo({ sizeBytes: 40 * MB })], {
      provider: 'tiktok',
      phase: 'uploading',
      publishId: 'publish-torto',
      uploadUrl: 'https://upload.tiktok.example/publish-torto',
      chunkSize: 16 * MB,
      totalBytes: 40 * MB,
    })
    const outcome = await publisher(api).publish(input)
    expect(outcome.kind).toBe('retryable')
    expect(input.session.publishId).toBeNull()
  })

  it('upload_url vencida (session_expired) → limpa a sessão + retryable', async () => {
    const api = new FakeTikTokApi()
    api.failUploadWith = new TikTokApiError('sessão inválida (403)', 'session_expired')
    const input = makeInput(makePublication(), [makeVideo()])
    const outcome = await publisher(api).publish(input)
    expect(outcome.kind).toBe('retryable')
    expect(input.session.publishId).toBeNull()
  })

  it('FAILED spam_risk_too_many_posts → deferred +1h; duration_check_failed → permanent com CTA', async () => {
    const api = new FakeTikTokApi()
    api.statusScript.set('publish-1', [
      { status: 'FAILED', failReason: 'spam_risk_too_many_posts' },
    ])
    const deferred = await publisher(api).publish(makeInput(makePublication(), [makeVideo()]))
    expect(deferred.kind).toBe('deferred')
    if (deferred.kind === 'deferred') {
      expect(deferred.nextAttemptAt.getTime()).toBe(NOW.getTime() + 60 * 60_000)
    }

    const api2 = new FakeTikTokApi()
    api2.statusScript.set('publish-1', [{ status: 'FAILED', failReason: 'duration_check_failed' }])
    const permanent = await publisher(api2).publish(makeInput(makePublication(), [makeVideo()]))
    expect(permanent.kind).toBe('permanent')
    if (permanent.kind === 'permanent') expect(permanent.reason).toContain('10 minutos')
  })

  it('rate limit no init → deferred +10min', async () => {
    const api = new FakeTikTokApi()
    api.failInitWith = new TikTokApiError('rate', 'rate')
    const outcome = await publisher(api).publish(makeInput(makePublication(), [makeVideo()]))
    expect(outcome.kind).toBe('deferred')
    if (outcome.kind === 'deferred') {
      expect(outcome.nextAttemptAt.getTime()).toBe(NOW.getTime() + 10 * 60_000)
    }
  })

  it('validações ANTES de side-effect: sem vídeo aceito e >4GB → permanent', async () => {
    const api = new FakeTikTokApi()
    const semVideo = await publisher(api).publish(
      makeInput(makePublication(), [makeVideo({ contentType: 'video/x-msvideo' })]),
    )
    expect(semVideo.kind).toBe('permanent')

    const grande = await publisher(api).publish(
      makeInput(makePublication(), [makeVideo({ sizeBytes: 5 * 1024 * MB })]),
    )
    expect(grande.kind).toBe('permanent')
    if (grande.kind === 'permanent') expect(grande.reason).toContain('4GB')
    expect(api.initCalls).toHaveLength(0)
  })

  it('crash pós-upload (phase processing): o status resolve sozinho no retry', async () => {
    const api = new FakeTikTokApi()
    api.statusScript.set('publish-antigo', [{ status: 'PUBLISH_COMPLETE', postIds: ['999'] }])
    const input = makeInput(makePublication(), [makeVideo()], {
      provider: 'tiktok',
      phase: 'processing',
      publishId: 'publish-antigo',
    })
    const outcome = await publisher(api).publish(input)
    expect(outcome.kind).toBe('published')
    if (outcome.kind === 'published') expect(outcome.externalPostId).toBe('999')
    expect(api.initCalls).toHaveLength(0)
    expect(api.uploadCalls).toHaveLength(0)
  })
})
