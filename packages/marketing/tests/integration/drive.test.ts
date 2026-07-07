import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { buildTestApp, request } from '../helpers'

function connectedAccount(): SocialAccount {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    network: 'youtube',
    externalId: 'google-sub-1',
    displayName: 'Conta Google',
    username: null,
    accessTokenEnc: 'sealed:access',
    refreshTokenEnc: 'sealed:refresh',
    tokenExpiresAt: new Date(now.getTime() + 3600_000),
    refreshExpiresAt: null,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    status: 'connected',
    metadata: {},
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: now,
    updatedAt: now,
  }
}

const VIDEO = {
  id: 'drive-file-000000001',
  name: 'reels-final.mp4',
  mimeType: 'video/mp4',
  sizeBytes: 1024,
  modifiedTime: '2026-07-01T10:00:00Z',
}

describe('Drive (picker + import)', () => {
  it('lista arquivos com conta conectada', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount())
    t.driveClient.addFile(VIDEO)
    const res = await request(t.app, 'GET', '/marketing/drive/files')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { files: Array<{ name: string }> }
    expect(body.files[0]?.name).toBe('reels-final.mp4')
  })

  it('sem conta conectada → 409 ACCOUNT_NOT_CONNECTED', async () => {
    const t = buildTestApp()
    const res = await request(t.app, 'GET', '/marketing/drive/files')
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('ACCOUNT_NOT_CONNECTED')
  })

  it('OAuth não configurado → 503', async () => {
    const t = buildTestApp({ googleEnabled: false })
    const res = await request(t.app, 'GET', '/marketing/drive/files')
    expect(res.status).toBe(503)
  })

  it('import por driveUrl (/d/<id>) cria asset importing com key server-side', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount())
    t.driveClient.addFile(VIDEO)
    const res = await request(t.app, 'POST', '/marketing/media/import', {
      body: { driveUrl: `https://drive.google.com/file/d/${VIDEO.id}/view?usp=sharing` },
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { id: string; status: string; filename: string }
    expect(body.status).toBe('importing')
    expect(body.filename).toBe('reels-final.mp4')
    const asset = t.repos.assets.rows.get(body.id)
    expect(asset?.driveFileId).toBe(VIDEO.id)
    expect(asset?.r2Key).toMatch(/^marketing\/inbox\/.+\.mp4$/)
  })

  it('link sem id reconhecível → 400 DRIVE_FILE_INVALID', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount())
    const res = await request(t.app, 'POST', '/marketing/media/import', {
      body: { driveUrl: 'https://drive.google.com/drive/folders' },
    })
    expect(res.status).toBe(400)
  })

  it('MIME fora da allowlist → 400 ASSET_TYPE_NOT_ALLOWED', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount())
    t.driveClient.addFile({ ...VIDEO, id: 'drive-file-000000002', mimeType: 'application/zip' })
    const res = await request(t.app, 'POST', '/marketing/media/import', {
      body: { driveFileId: 'drive-file-000000002' },
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('ASSET_TYPE_NOT_ALLOWED')
  })

  it('arquivo apagado/sem acesso no Drive → 400 DRIVE_FILE_INVALID', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount())
    const res = await request(t.app, 'POST', '/marketing/media/import', {
      body: { driveFileId: 'drive-file-inexistente' },
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('DRIVE_FILE_INVALID')
  })

  it('contentId inexistente → 404 (validado antes da FK)', async () => {
    const t = buildTestApp()
    await t.repos.accounts.create(connectedAccount())
    t.driveClient.addFile(VIDEO)
    const res = await request(t.app, 'POST', '/marketing/media/import', {
      body: { driveFileId: VIDEO.id, contentId: randomUUID() },
    })
    expect(res.status).toBe(404)
  })
})
