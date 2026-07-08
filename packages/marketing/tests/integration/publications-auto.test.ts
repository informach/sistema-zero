import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { Content } from '../../src/domain/content/content'
import type { Publication } from '../../src/domain/publication/publication-record'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { buildTestApp, request } from '../helpers'

function makeContent(): Content {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    title: 'Vídeo',
    contentType: 'video_long',
    stage: 'approved',
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

function makePublication(contentId: string, overrides: Partial<Publication> = {}): Publication {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    contentId,
    socialAccountId: null,
    network: 'youtube',
    format: 'yt_video',
    caption: '',
    title: 'Título',
    tags: [],
    coverAssetId: null,
    scheduledAt: null,
    publishMode: 'manual',
    status: 'draft',
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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function capableAccount(externalId = 'sub-1'): SocialAccount {
  const now = new Date()
  return {
    id: randomUUID(),
    version: 0,
    network: 'youtube',
    externalId,
    displayName: 'Canal',
    username: null,
    accessTokenEnc: 'sealed:a',
    refreshTokenEnc: 'sealed:r',
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

const AUTO = { autoCapableNetworks: new Set<'youtube'>(['youtube']) }

describe('publish_mode auto (F2 — YouTube)', () => {
  async function seed(t: ReturnType<typeof buildTestApp>) {
    const content = makeContent()
    await t.repos.contents.create(content)
    const pub = makePublication(content.id)
    await t.repos.publications.create(pub)
    return { content, pub }
  }

  it('liga o auto com conta apta e faz o BINDING da conta única', async () => {
    const t = buildTestApp(AUTO)
    const account = capableAccount()
    await t.repos.accounts.create(account)
    const { pub } = await seed(t)
    const res = await request(t.app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { publishMode: 'auto', version: 0 },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { publishMode: string; socialAccountId: string }
    expect(body.publishMode).toBe('auto')
    expect(body.socialAccountId).toBe(account.id)
  })

  it('sem conta conectada → 409 AUTO_PUBLISH_UNAVAILABLE', async () => {
    const t = buildTestApp(AUTO)
    const { pub } = await seed(t)
    const res = await request(t.app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { publishMode: 'auto', version: 0 },
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('AUTO_PUBLISH_UNAVAILABLE')
  })

  it('conta sem os escopos de publicação → 409', async () => {
    const t = buildTestApp(AUTO)
    await t.repos.accounts.create({ ...capableAccount(), scopes: ['openid'] })
    const { pub } = await seed(t)
    const res = await request(t.app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { publishMode: 'auto', version: 0 },
    })
    expect(res.status).toBe(409)
  })

  it('rede sem publisher montado (F1) → 409', async () => {
    const t = buildTestApp() // sem autoCapableNetworks
    await t.repos.accounts.create(capableAccount())
    const { pub } = await seed(t)
    const res = await request(t.app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { publishMode: 'auto', version: 0 },
    })
    expect(res.status).toBe(409)
  })

  it('ig_story NUNCA vira auto', async () => {
    const t = buildTestApp(AUTO)
    await t.repos.accounts.create(capableAccount())
    const content = makeContent()
    await t.repos.contents.create(content)
    const pub = makePublication(content.id, { format: 'ig_story', network: 'instagram' })
    await t.repos.publications.create(pub)
    const res = await request(t.app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { publishMode: 'auto', version: 0 },
    })
    expect(res.status).toBe(409)
  })

  it('duas contas aptas sem socialAccountId → 400 pedindo a escolha', async () => {
    const t = buildTestApp(AUTO)
    await t.repos.accounts.create(capableAccount('sub-1'))
    await t.repos.accounts.create(capableAccount('sub-2'))
    const { pub } = await seed(t)
    const res = await request(t.app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { publishMode: 'auto', version: 0 },
    })
    expect(res.status).toBe(400)
  })

  describe('pós-upload (providerSession.videoId presente)', () => {
    it('PATCH de metadados → 409 (edite no Studio ou cancele e recrie)', async () => {
      const t = buildTestApp(AUTO)
      const content = makeContent()
      await t.repos.contents.create(content)
      const pub = makePublication(content.id, {
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 3600_000),
        providerSession: { provider: 'youtube', videoId: 'vid-1' },
      })
      await t.repos.publications.create(pub)
      const res = await request(t.app, 'PATCH', `/marketing/publications/${pub.id}`, {
        body: { caption: 'nova legenda', version: 0 },
      })
      expect(res.status).toBe(409)
    })

    it('reagendar → 200 e arma a fase resync do worker', async () => {
      const t = buildTestApp(AUTO)
      const content = makeContent()
      await t.repos.contents.create(content)
      const pub = makePublication(content.id, {
        status: 'scheduled',
        publishMode: 'auto',
        scheduledAt: new Date(Date.now() + 3600_000),
        providerSession: { provider: 'youtube', videoId: 'vid-1' },
      })
      await t.repos.publications.create(pub)
      const newTime = new Date(Date.now() + 7200_000).toISOString()
      const res = await request(t.app, 'POST', `/marketing/publications/${pub.id}/schedule`, {
        body: { scheduledAt: newTime },
      })
      expect(res.status).toBe(200)
      const stored = t.repos.publications.rows.get(pub.id)
      expect(stored?.providerSession.phase).toBe('resync_publish_at')
      expect(stored?.nextAttemptAt).not.toBeNull()
    })

    it('cancelar mantém o aviso de limpeza manual no Studio', async () => {
      const t = buildTestApp(AUTO)
      const content = makeContent()
      await t.repos.contents.create(content)
      const pub = makePublication(content.id, {
        status: 'scheduled',
        publishMode: 'auto',
        scheduledAt: new Date(Date.now() + 3600_000),
        providerSession: { provider: 'youtube', videoId: 'vid-1' },
      })
      await t.repos.publications.create(pub)
      const res = await request(t.app, 'POST', `/marketing/publications/${pub.id}/cancel`)
      expect(res.status).toBe(200)
      const stored = t.repos.publications.rows.get(pub.id)
      expect(stored?.status).toBe('canceled')
      expect(stored?.lastError ?? '').toContain('YouTube Studio')
    })

    it('a view expõe hasRemoteVideo', async () => {
      const t = buildTestApp(AUTO)
      const content = makeContent()
      await t.repos.contents.create(content)
      const pub = makePublication(content.id, {
        providerSession: { provider: 'youtube', videoId: 'vid-1' },
      })
      await t.repos.publications.create(pub)
      const res = await request(t.app, 'GET', `/marketing/publications/${pub.id}`)
      const body = (await res.json()) as { hasRemoteVideo: boolean }
      expect(body.hasRemoteVideo).toBe(true)
    })
  })
})
