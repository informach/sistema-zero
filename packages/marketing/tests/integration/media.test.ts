import { describe, expect, it } from 'bun:test'
import type { AssetView } from '../../src/application/mappers/views'
import { buildTestApp, request } from '../helpers'

interface PresignResponse {
  assetId: string
  uploadUrl: string
  contentType: string
}

describe('media (presign → upload direto → confirm → resolve)', () => {
  it('presign valida MIME → 400', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'POST', '/marketing/media/presign', {
      body: { filename: 'virus.exe', contentType: 'application/x-msdownload', sizeBytes: 1000 },
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('ASSET_TYPE_NOT_ALLOWED')
  })

  it('presign valida teto de tamanho → 400', async () => {
    const { app } = buildTestApp({ maxUploadBytes: 1024 })
    const res = await request(app, 'POST', '/marketing/media/presign', {
      body: { filename: 'video.mp4', contentType: 'video/mp4', sizeBytes: 2048 },
    })
    expect(res.status).toBe(400)
  })

  it('fluxo feliz: presign → PUT (simulado) → confirm ready → resolve', async () => {
    const { app, store, repos } = buildTestApp()
    const presign = await request(app, 'POST', '/marketing/media/presign', {
      body: { filename: 'reels-final.mp4', contentType: 'video/mp4', sizeBytes: 5000 },
    })
    expect(presign.status).toBe(201)
    const target = (await presign.json()) as PresignResponse
    expect(target.uploadUrl).toContain('fake-r2.local/put/')

    const asset = repos.assets.rows.get(target.assetId)
    expect(asset?.status).toBe('pending_upload')
    expect(asset?.r2Key).toMatch(/^marketing\/inbox\//)

    // Simula o PUT do browser no R2.
    if (asset?.r2Key) store.objects.set(asset.r2Key, 5000)

    const confirm = await request(app, 'POST', `/marketing/media/${target.assetId}/confirm`)
    expect(confirm.status).toBe(200)
    const confirmed = (await confirm.json()) as AssetView
    expect(confirmed.status).toBe('ready')

    const resolve = await request(app, 'GET', `/marketing/media/${target.assetId}/resolve`)
    expect(resolve.status).toBe(200)
    const { url } = (await resolve.json()) as { url: string }
    expect(url).toContain('fake-r2.local/get/')
  })

  it('confirm sem upload → 409; tamanho divergente → 400 + objeto apagado', async () => {
    const { app, store, repos } = buildTestApp()
    const presign = await request(app, 'POST', '/marketing/media/presign', {
      body: { filename: 'capa.png', contentType: 'image/png', sizeBytes: 1000 },
    })
    const target = (await presign.json()) as PresignResponse

    const missing = await request(app, 'POST', `/marketing/media/${target.assetId}/confirm`)
    expect(missing.status).toBe(409)

    const key = repos.assets.rows.get(target.assetId)?.r2Key
    expect(key).toBeTruthy()
    if (!key) return
    store.objects.set(key, 999_999)
    const mismatched = await request(app, 'POST', `/marketing/media/${target.assetId}/confirm`)
    expect(mismatched.status).toBe(400)
    expect(store.deleted).toContain(key)
  })

  it('resolve de asset pendente → 409', async () => {
    const { app } = buildTestApp()
    const presign = await request(app, 'POST', '/marketing/media/presign', {
      body: { filename: 'a.png', contentType: 'image/png', sizeBytes: 10 },
    })
    const target = (await presign.json()) as PresignResponse
    const res = await request(app, 'GET', `/marketing/media/${target.assetId}/resolve`)
    expect(res.status).toBe(409)
  })

  it('contentId inexistente (uuid válido) → 404, não 500 de FK', async () => {
    const { app } = buildTestApp()
    const ghost = '99999999-9999-4999-8999-999999999999'
    const presign = await request(app, 'POST', '/marketing/media/presign', {
      body: { filename: 'c.png', contentType: 'image/png', sizeBytes: 10, contentId: ghost },
    })
    expect(presign.status).toBe(404)

    const orphan = await request(app, 'POST', '/marketing/media/presign', {
      body: { filename: 'c.png', contentType: 'image/png', sizeBytes: 10 },
    })
    const target = (await orphan.json()) as PresignResponse
    const attach = await request(app, 'PATCH', `/marketing/media/${target.assetId}`, {
      body: { contentId: ghost },
    })
    expect(attach.status).toBe(404)
    const body = (await attach.json()) as { error: { code: string } }
    expect(body.error.code).toBe('CONTENT_NOT_FOUND')
  })

  it('lista filtra por conteúdo e o PATCH vincula asset da biblioteca', async () => {
    const { app } = buildTestApp()
    const presign = await request(app, 'POST', '/marketing/media/presign', {
      body: { filename: 'b.png', contentType: 'image/png', sizeBytes: 10 },
    })
    const target = (await presign.json()) as PresignResponse
    const contentRes = await request(app, 'POST', '/marketing/contents', {
      body: { title: 'Post', contentType: 'static_post' },
    })
    const content = (await contentRes.json()) as { id: string }
    const attach = await request(app, 'PATCH', `/marketing/media/${target.assetId}`, {
      body: { contentId: content.id, kind: 'final' },
    })
    expect(attach.status).toBe(200)
    const list = await request(app, 'GET', `/marketing/media?contentId=${content.id}`)
    const body = (await list.json()) as { items: AssetView[]; total: number }
    expect(body.total).toBe(1)
    expect(body.items[0]?.kind).toBe('final')
  })
})
