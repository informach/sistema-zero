import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccountService } from '../../src/application/accounts/account.service'
import type { Content } from '../../src/domain/content/content'
import type { MediaAsset } from '../../src/domain/media/media-asset'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { DRIVE_FILE_SCOPE } from '../../src/infrastructure/gateways/google/google-oauth-provider'
import { MediaArchiverWorker } from '../../src/infrastructure/workers/media-archiver-worker'
import {
  FakeDriveClient,
  FakeMediaStore,
  FakeOAuthProvider,
  FakeSecretBox,
  InMemoryContentRepository,
  InMemoryMediaAssetRepository,
  InMemorySocialAccountRepository,
} from '../fakes/in-memory'
import { buildTestApp, request } from '../helpers'

const NOW = new Date('2026-07-08T12:00:00Z')
const DAY = 86_400_000

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: randomUUID(),
    version: 0,
    title: 'Conteúdo publicado',
    contentType: 'reels',
    stage: 'published',
    brief: null,
    script: null,
    ownerUserId: null,
    ownerName: null,
    dueDate: null,
    ideaId: null,
    createdBy: randomUUID(),
    createdAt: new Date(NOW.getTime() - 60 * DAY),
    updatedAt: new Date(NOW.getTime() - 40 * DAY), // publicado há 40d (>30d)
    ...overrides,
  }
}

function makeAsset(contentId: string, overrides: Partial<MediaAsset> = {}): MediaAsset {
  const id = randomUUID()
  return {
    id,
    version: 0,
    contentId,
    kind: 'final',
    r2Key: `marketing/${contentId}/${id}.mp4`,
    driveFileId: null,
    filename: 'video-final.mp4',
    contentType: 'video/mp4',
    sizeBytes: 1024,
    status: 'ready',
    transferAttempts: 0,
    transferNextAt: null,
    transferError: null,
    archivedAt: null,
    r2DeletedAt: null,
    createdBy: randomUUID(),
    createdAt: new Date(NOW.getTime() - 60 * DAY),
    updatedAt: new Date(NOW.getTime() - 40 * DAY),
    ...overrides,
  }
}

function googleAccount(scopes: string[]): SocialAccount {
  return {
    id: randomUUID(),
    version: 0,
    network: 'youtube',
    externalId: 'sub-1',
    displayName: 'Conta Google',
    username: null,
    accessTokenEnc: 'sealed:g-access',
    refreshTokenEnc: 'sealed:g-refresh',
    tokenExpiresAt: new Date(NOW.getTime() + 3600_000),
    refreshExpiresAt: null,
    scopes,
    status: 'connected',
    metadata: {},
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function setup(input: { scopes?: string[] } = {}) {
  const assets = new InMemoryMediaAssetRepository()
  const contents = new InMemoryContentRepository()
  assets.contentsRef = contents
  const store = new FakeMediaStore()
  const drive = new FakeDriveClient()
  const accounts = new InMemorySocialAccountRepository()
  const warns: string[] = []
  const logger = { ...silentLogger, warn: (msg: string) => warns.push(msg) }
  const accountService = new AccountService(
    accounts,
    { providers: new Map([['youtube', new FakeOAuthProvider()]]), secretBox: new FakeSecretBox() },
    new Set(),
    () => NOW,
    silentLogger,
  )
  const worker = new MediaArchiverWorker({
    assets,
    store,
    drive,
    accounts: accountService,
    now: () => NOW,
    logger,
    config: { intervalMs: 1000, batchSize: 5, leaseMs: 30 * 60_000, maxAttempts: 5, afterDays: 30 },
  })
  return { assets, contents, store, drive, accounts, worker, warns, scopes: input.scopes }
}

async function seedEligible(s: ReturnType<typeof setup>, scopes?: string[]) {
  await s.accounts.create(
    googleAccount(scopes ?? ['https://www.googleapis.com/auth/drive.readonly', DRIVE_FILE_SCOPE]),
  )
  const content = makeContent()
  await s.contents.create(content)
  const asset = makeAsset(content.id)
  await s.assets.create(asset)
  s.store.objects.set(asset.r2Key as string, asset.sizeBytes)
  return { content, asset }
}

describe('media-archiver-worker (R2→Drive)', () => {
  it('feliz: sobe pro Drive, persiste archived+driveFileId ANTES de apagar do R2', async () => {
    const s = setup()
    const { asset } = await seedEligible(s)

    await s.worker.tick()

    const stored = s.assets.rows.get(asset.id)
    expect(stored?.status).toBe('archived')
    expect(stored?.driveFileId).toBe('drive-file-1')
    expect(stored?.archivedAt).not.toBeNull()
    expect(stored?.r2DeletedAt).not.toBeNull()
    expect(s.store.deleted).toEqual([asset.r2Key as string])
    expect(s.drive.uploads).toHaveLength(1)
    expect(s.drive.uploads[0]).toMatchObject({
      name: 'video-final.mp4',
      parentFolderId: 'folder-1',
    })
    expect(s.drive.folders.get('Sistema Zero Marketing — Arquivo')).toBe('folder-1')
  })

  it('conta Google SEM o escopo drive.file → espera com warn (nada claimado)', async () => {
    const s = setup()
    const { asset } = await seedEligible(s, ['https://www.googleapis.com/auth/drive.readonly'])

    await s.worker.tick()

    expect(s.assets.rows.get(asset.id)?.status).toBe('ready')
    expect(s.drive.uploads).toHaveLength(0)
    expect(s.warns).toContain('media_archiver.scope_missing')
  })

  it('conteúdo NÃO publicado (ou publicado há menos de 30d) não é claimado', async () => {
    const s = setup()
    await s.accounts.create(googleAccount([DRIVE_FILE_SCOPE]))
    const emProducao = makeContent({ stage: 'approved' })
    const recente = makeContent({ updatedAt: new Date(NOW.getTime() - 5 * DAY) })
    await s.contents.create(emProducao)
    await s.contents.create(recente)
    const a1 = makeAsset(emProducao.id)
    const a2 = makeAsset(recente.id)
    await s.assets.create(a1)
    await s.assets.create(a2)

    await s.worker.tick()

    expect(s.assets.rows.get(a1.id)?.status).toBe('ready')
    expect(s.assets.rows.get(a2.id)?.status).toBe('ready')
    expect(s.drive.uploads).toHaveLength(0)
  })

  it('falha TRANSITÓRIA no upload → backoff (segue archiving, lease reagendado)', async () => {
    const s = setup()
    const { asset } = await seedEligible(s)
    s.drive.failUploadWith = 'transient'

    await s.worker.tick()

    const stored = s.assets.rows.get(asset.id)
    expect(stored?.status).toBe('archiving')
    expect(stored?.transferError).toContain('upload falhou')
    expect(s.store.deleted).toHaveLength(0) // NUNCA apaga sem checkpoint
  })

  it('falha PERMANENTE → volta a ready (nunca failed) com retry em 7 dias', async () => {
    const s = setup()
    const { asset } = await seedEligible(s)
    s.drive.failUploadWith = 'permanent'

    await s.worker.tick()

    const stored = s.assets.rows.get(asset.id)
    expect(stored?.status).toBe('ready')
    expect(stored?.transferError).toContain('upload falhou')
    expect(stored?.transferNextAt?.getTime()).toBe(NOW.getTime() + 7 * DAY)
    expect(s.store.deleted).toHaveLength(0)
  })

  it('objeto sumido do R2 → volta a ready com o motivo (sem tocar o Drive)', async () => {
    const s = setup()
    const { asset } = await seedEligible(s)
    s.store.objects.delete(asset.r2Key as string)

    await s.worker.tick()

    const stored = s.assets.rows.get(asset.id)
    expect(stored?.status).toBe('ready')
    expect(stored?.transferError).toContain('não encontrado no R2')
    expect(s.drive.uploads).toHaveLength(0)
  })
})

describe('GET /marketing/media/:id/resolve de asset ARQUIVADO', () => {
  it('devolve o link do arquivo no Drive (o objeto saiu do R2)', async () => {
    const t = buildTestApp()
    const asset = makeAsset(randomUUID(), {
      status: 'archived',
      driveFileId: 'drive-abc',
      r2DeletedAt: NOW,
    })
    t.repos.assets.rows.set(asset.id, asset)
    const res = await request(t.app, 'GET', `/marketing/media/${asset.id}/resolve`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { url: string }
    expect(body.url).toBe('https://drive.google.com/file/d/drive-abc/view')
  })
})
