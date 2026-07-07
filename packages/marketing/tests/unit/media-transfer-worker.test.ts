import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { AccountService } from '../../src/application/accounts/account.service'
import type { MediaAsset } from '../../src/domain/media/media-asset'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { MediaTransferWorker } from '../../src/infrastructure/workers/media-transfer-worker'
import {
  FakeDriveClient,
  FakeMediaStore,
  FakeOAuthProvider,
  FakeSecretBox,
  InMemoryMediaAssetRepository,
  InMemorySocialAccountRepository,
} from '../fakes/in-memory'

const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

const CONFIG = {
  intervalMs: 1000,
  batchSize: 5,
  leaseMs: 30 * 60_000,
  maxAttempts: 3,
  maxUploadBytes: 2 * 1024 * 1024 * 1024,
}

function connectedAccount(): SocialAccount {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    network: 'youtube',
    externalId: 'sub-1',
    displayName: 'Conta',
    username: null,
    accessTokenEnc: 'sealed:token',
    refreshTokenEnc: 'sealed:refresh',
    tokenExpiresAt: new Date(now.getTime() + 3600_000),
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

function importingAsset(driveFileId: string, overrides: Partial<MediaAsset> = {}): MediaAsset {
  const now = new Date()
  const id = randomUUID()
  return {
    id,
    version: 0,
    contentId: null,
    kind: 'final',
    r2Key: `marketing/inbox/${id}.mp4`,
    driveFileId,
    filename: 'video.mp4',
    contentType: 'video/mp4',
    sizeBytes: 1024,
    status: 'importing',
    transferAttempts: 0,
    transferNextAt: null,
    transferError: null,
    archivedAt: null,
    r2DeletedAt: null,
    createdBy: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function setup() {
  const assets = new InMemoryMediaAssetRepository()
  const accounts = new InMemorySocialAccountRepository()
  const store = new FakeMediaStore()
  const drive = new FakeDriveClient()
  const provider = new FakeOAuthProvider()
  const secretBox = new FakeSecretBox()
  let currentTime = new Date()
  const accountService = new AccountService(
    accounts,
    { provider, secretBox },
    new Set(),
    () => currentTime,
    silentLogger,
  )
  const worker = new MediaTransferWorker({
    assets,
    store,
    drive,
    accounts: accountService,
    now: () => currentTime,
    logger: silentLogger,
    config: CONFIG,
  })
  return {
    assets,
    accounts,
    store,
    drive,
    worker,
    advance(ms: number) {
      currentTime = new Date(currentTime.getTime() + ms)
    },
  }
}

const FILE = {
  id: 'drive-file-000000001',
  name: 'video.mp4',
  mimeType: 'video/mp4',
  sizeBytes: 1024,
  modifiedTime: null,
}

describe('media-transfer-worker (import Drive→R2)', () => {
  it('importing → ready: stream + put + head confere', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount())
    s.drive.addFile(FILE, new Uint8Array(1024))
    const asset = importingAsset(FILE.id)
    await s.assets.create(asset)

    await s.worker.tick()

    const stored = s.assets.rows.get(asset.id)
    expect(stored?.status).toBe('ready')
    expect(stored?.transferError).toBeNull()
    expect(stored?.transferNextAt).toBeNull()
    expect(s.store.putCalls).toHaveLength(1)
    expect(s.store.putCalls[0]?.key).toBe(asset.r2Key ?? '')
  })

  it('arquivo sumiu do Drive (permanente) → failed', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount())
    const asset = importingAsset('drive-file-apagado')
    await s.assets.create(asset)

    await s.worker.tick()

    const stored = s.assets.rows.get(asset.id)
    expect(stored?.status).toBe('failed')
    expect(stored?.transferError).toBeTruthy()
  })

  it('falha transitória no put → backoff e segue importing', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount())
    s.drive.addFile(FILE, new Uint8Array(1024))
    s.store.failPutWith = new Error('R2 instável')
    const asset = importingAsset(FILE.id)
    await s.assets.create(asset)

    await s.worker.tick()

    const stored = s.assets.rows.get(asset.id)
    expect(stored?.status).toBe('importing')
    expect(stored?.transferError ?? '').toContain('R2 instável')
    expect(stored?.transferNextAt).not.toBeNull()
    expect(stored?.transferAttempts).toBe(1)

    // Recupera no retry após o backoff.
    s.store.failPutWith = null
    s.advance(31 * 60_000)
    await s.worker.tick()
    expect(s.assets.rows.get(asset.id)?.status).toBe('ready')
  })

  it('teto de tentativas → failed', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount())
    s.drive.addFile(FILE, new Uint8Array(1024))
    s.store.failPutWith = new Error('sempre falha')
    const asset = importingAsset(FILE.id)
    await s.assets.create(asset)

    for (let i = 0; i <= CONFIG.maxAttempts; i++) {
      await s.worker.tick()
      s.advance(31 * 60_000)
    }

    expect(s.assets.rows.get(asset.id)?.status).toBe('failed')
  })

  it('MIME mudou no Drive p/ tipo proibido → failed', async () => {
    const s = setup()
    await s.accounts.create(connectedAccount())
    s.drive.addFile({ ...FILE, mimeType: 'application/zip' })
    const asset = importingAsset(FILE.id)
    await s.assets.create(asset)

    await s.worker.tick()

    expect(s.assets.rows.get(asset.id)?.status).toBe('failed')
  })

  it('sem conta conectada → failed (permanente, orienta reconectar)', async () => {
    const s = setup()
    const asset = importingAsset(FILE.id)
    await s.assets.create(asset)

    await s.worker.tick()

    expect(s.assets.rows.get(asset.id)?.status).toBe('failed')
  })
})
