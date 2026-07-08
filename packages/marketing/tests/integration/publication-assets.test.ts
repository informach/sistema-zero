import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { ContentDetailView, PublicationView } from '../../src/application/mappers/views'
import type { AssetStatus, MediaAsset } from '../../src/domain/media/media-asset'
import { buildTestApp, request, STAFF_USER_ID, type TestApp } from '../helpers'
import { completeChecklist, createContent } from './contents.test'

async function approvedContent(app: TestApp['app']): Promise<ContentDetailView> {
  const content = await createContent(app)
  await completeChecklist(app, content)
  const res = await request(app, 'POST', `/marketing/contents/${content.id}/stage`, {
    body: { to: 'approved' },
  })
  return (await res.json()) as ContentDetailView
}

async function createCarousel(t: TestApp, contentId: string): Promise<PublicationView> {
  const res = await request(t.app, 'POST', `/marketing/contents/${contentId}/publications`, {
    body: { formats: ['ig_carousel'] },
  })
  const [pub] = (await res.json()) as PublicationView[]
  return pub as PublicationView
}

function readyImage(
  t: TestApp,
  contentId: string | null,
  overrides: Partial<MediaAsset> = {},
): string {
  const id = randomUUID()
  const now = new Date()
  t.repos.assets.rows.set(id, {
    id,
    version: 0,
    contentId,
    kind: 'final',
    r2Key: `marketing/${contentId ?? 'inbox'}/${id}.jpg`,
    driveFileId: null,
    filename: `${id.slice(0, 8)}.jpg`,
    contentType: 'image/jpeg',
    sizeBytes: 1024,
    status: 'ready' as AssetStatus,
    transferAttempts: 0,
    transferNextAt: null,
    transferError: null,
    archivedAt: null,
    r2DeletedAt: null,
    createdBy: STAFF_USER_ID,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })
  return id
}

function putAssets(t: TestApp, pubId: string, assetIds: string[]): Promise<Response> {
  return request(t.app, 'PUT', `/marketing/publications/${pubId}/assets`, {
    body: { assetIds },
  })
}

describe('PUT /marketing/publications/:id/assets (carrossel)', () => {
  it('grava a lista ordenada; GET e reordenação refletem a ordem', async () => {
    const t = buildTestApp()
    const content = await approvedContent(t.app)
    const pub = await createCarousel(t, content.id)
    const a = readyImage(t, content.id)
    const b = readyImage(t, content.id)
    const c = readyImage(t, content.id)

    const res = await putAssets(t, pub.id, [a, b, c])
    expect(res.status).toBe(200)
    expect(((await res.json()) as PublicationView).assetIds).toEqual([a, b, c])

    const view = (await (
      await request(t.app, 'GET', `/marketing/publications/${pub.id}`)
    ).json()) as PublicationView
    expect(view.assetIds).toEqual([a, b, c])

    // PUT é o estado final: reordenar e remover numa chamada só.
    const res2 = await putAssets(t, pub.id, [c, a])
    expect(((await res2.json()) as PublicationView).assetIds).toEqual([c, a])
  })

  it('imagem repetida na lista → 400', async () => {
    const t = buildTestApp()
    const content = await approvedContent(t.app)
    const pub = await createCarousel(t, content.id)
    const a = readyImage(t, content.id)
    expect((await putAssets(t, pub.id, [a, a])).status).toBe(400)
  })

  it('mídia de OUTRO conteúdo (ou inexistente) → 400', async () => {
    const t = buildTestApp()
    const content = await approvedContent(t.app)
    const other = await approvedContent(t.app)
    const pub = await createCarousel(t, content.id)
    const alheio = readyImage(t, other.id)
    expect((await putAssets(t, pub.id, [alheio])).status).toBe(400)
    expect((await putAssets(t, pub.id, [randomUUID()])).status).toBe(400)
  })

  it('mídia que ainda não terminou de subir → 400', async () => {
    const t = buildTestApp()
    const content = await approvedContent(t.app)
    const pub = await createCarousel(t, content.id)
    const subindo = readyImage(t, content.id, { status: 'importing' })
    expect((await putAssets(t, pub.id, [subindo])).status).toBe(400)
  })

  it('mais de 10 imagens → 400 na borda (teto da Graph API)', async () => {
    const t = buildTestApp()
    const content = await approvedContent(t.app)
    const pub = await createCarousel(t, content.id)
    const ids = Array.from({ length: 11 }, () => readyImage(t, content.id))
    expect((await putAssets(t, pub.id, ids)).status).toBe(400)
  })

  it('publicação publicada não aceita mais mudar os assets → 409', async () => {
    const t = buildTestApp()
    const content = await approvedContent(t.app)
    const pub = await createCarousel(t, content.id)
    const a = readyImage(t, content.id)
    await request(t.app, 'POST', `/marketing/publications/${pub.id}/mark-published`, { body: {} })
    expect((await putAssets(t, pub.id, [a])).status).toBe(409)
  })

  it('listagens (Calendário/Painel) seguem com assetIds vazio — só a view de UMA publicação carrega', async () => {
    const t = buildTestApp()
    const content = await approvedContent(t.app)
    const pub = await createCarousel(t, content.id)
    const a = readyImage(t, content.id)
    await putAssets(t, pub.id, [a])
    const page = (await (
      await request(t.app, 'GET', `/marketing/publications?contentId=${content.id}`)
    ).json()) as { items: PublicationView[] }
    expect(page.items[0]?.assetIds).toEqual([])
  })
})
