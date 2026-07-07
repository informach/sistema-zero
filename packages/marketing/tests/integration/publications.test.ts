import { describe, expect, it } from 'bun:test'
import type { ContentDetailView, PublicationView } from '../../src/application/mappers/views'
import { buildTestApp, request, type TestApp } from '../helpers'
import { completeChecklist, createContent } from './contents.test'

async function approvedContent(app: TestApp['app']): Promise<ContentDetailView> {
  const content = await createContent(app)
  await completeChecklist(app, content)
  const res = await request(app, 'POST', `/marketing/contents/${content.id}/stage`, {
    body: { to: 'approved' },
  })
  return (await res.json()) as ContentDetailView
}

async function contentStage(app: TestApp['app'], id: string): Promise<string> {
  const res = await request(app, 'GET', `/marketing/contents/${id}`)
  return ((await res.json()) as ContentDetailView).stage
}

describe('publications (cross-post + modo lembrete)', () => {
  it('conteúdo não aprovado não gera publicações → 409', async () => {
    const { app } = buildTestApp()
    const content = await createContent(app)
    const res = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_reels'] },
    })
    expect(res.status).toBe(409)
  })

  it('cross-post: 3 formatos → 3 publicações draft herdando a legenda-base', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)
    const res = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_reels', 'yt_short', 'tt_video'], caption: 'Legenda base' },
    })
    expect(res.status).toBe(201)
    const pubs = (await res.json()) as PublicationView[]
    expect(pubs).toHaveLength(3)
    expect(pubs.map((p) => p.network).sort()).toEqual(['instagram', 'tiktok', 'youtube'])
    expect(pubs.every((p) => p.status === 'draft' && p.caption === 'Legenda base')).toBe(true)
    expect(pubs.every((p) => p.publishMode === 'manual')).toBe(true)
  })

  it('agendar move o conteúdo p/ scheduled; publicar tudo move p/ published', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)
    const createRes = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_reels', 'yt_short'] },
    })
    const pubs = (await createRes.json()) as PublicationView[]
    const [first, second] = pubs as [PublicationView, PublicationView]

    const when = new Date(Date.now() + 3_600_000).toISOString()
    for (const pub of pubs) {
      const res = await request(app, 'POST', `/marketing/publications/${pub.id}/schedule`, {
        body: { scheduledAt: when },
      })
      expect(res.status).toBe(200)
    }
    expect(await contentStage(app, content.id)).toBe('scheduled')

    const mark1 = await request(app, 'POST', `/marketing/publications/${first.id}/mark-published`, {
      body: { externalUrl: 'https://www.instagram.com/reel/abc123/' },
    })
    expect(mark1.status).toBe(200)
    // Ainda falta a segunda → conteúdo segue scheduled.
    expect(await contentStage(app, content.id)).toBe('scheduled')

    const mark2 = await request(
      app,
      'POST',
      `/marketing/publications/${second.id}/mark-published`,
      { body: {} },
    )
    expect(mark2.status).toBe(200)
    expect(await contentStage(app, content.id)).toBe('published')

    const view = (await (
      await request(app, 'GET', `/marketing/publications/${first.id}`)
    ).json()) as PublicationView
    expect(view.status).toBe('published')
    expect(view.externalUrl).toBe('https://www.instagram.com/reel/abc123/')
    expect(view.publishedAt).not.toBeNull()
  })

  it('cancelar a única publicação devolve o conteúdo a approved', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)
    const createRes = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_feed'] },
    })
    const [pub] = (await createRes.json()) as [PublicationView]
    await request(app, 'POST', `/marketing/publications/${pub.id}/schedule`, {
      body: { scheduledAt: new Date(Date.now() + 3_600_000).toISOString() },
    })
    expect(await contentStage(app, content.id)).toBe('scheduled')
    const cancel = await request(app, 'POST', `/marketing/publications/${pub.id}/cancel`)
    expect(cancel.status).toBe(200)
    expect(await contentStage(app, content.id)).toBe('approved')
  })

  it('modo auto ainda indisponível → 409 AUTO_PUBLISH_UNAVAILABLE', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)
    const createRes = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_reels'] },
    })
    const [pub] = (await createRes.json()) as [PublicationView]
    const res = await request(app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { publishMode: 'auto', version: pub.version },
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('AUTO_PUBLISH_UNAVAILABLE')
  })

  it('publicada não se edita nem se re-agenda', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)
    const createRes = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_story'] },
    })
    const [pub] = (await createRes.json()) as [PublicationView]
    await request(app, 'POST', `/marketing/publications/${pub.id}/mark-published`, { body: {} })
    const edit = await request(app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { caption: 'tarde demais', version: pub.version + 1 },
    })
    expect(edit.status).toBe(409)
    const reschedule = await request(app, 'POST', `/marketing/publications/${pub.id}/schedule`, {
      body: { scheduledAt: new Date().toISOString() },
    })
    expect(reschedule.status).toBe(409)
  })

  it('scheduledAt inválido → 400', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)
    const createRes = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_feed'] },
    })
    const [pub] = (await createRes.json()) as [PublicationView]
    const res = await request(app, 'POST', `/marketing/publications/${pub.id}/schedule`, {
      body: { scheduledAt: 'ontem de tarde' },
    })
    expect(res.status).toBe(400)
  })

  it('janela de agendamento: passado e além de 2 anos → 400 (schedule e PATCH)', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)
    const createRes = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_feed'] },
    })
    const [pub] = (await createRes.json()) as [PublicationView]

    const past = await request(app, 'POST', `/marketing/publications/${pub.id}/schedule`, {
      body: { scheduledAt: new Date(Date.now() - 3_600_000).toISOString() },
    })
    expect(past.status).toBe(400)

    const tooFar = await request(app, 'POST', `/marketing/publications/${pub.id}/schedule`, {
      body: { scheduledAt: new Date(Date.now() + 3 * 365 * 86_400_000).toISOString() },
    })
    expect(tooFar.status).toBe(400)

    const patchPast = await request(app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { scheduledAt: new Date(Date.now() - 3_600_000).toISOString(), version: pub.version },
    })
    expect(patchPast.status).toBe(400)
  })

  it('PATCH não anula o horário de publicação agendada → 409 (cancele ou reagende)', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)
    const createRes = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_feed'] },
    })
    const [pub] = (await createRes.json()) as [PublicationView]
    const scheduleRes = await request(app, 'POST', `/marketing/publications/${pub.id}/schedule`, {
      body: { scheduledAt: new Date(Date.now() + 3_600_000).toISOString() },
    })
    const scheduled = (await scheduleRes.json()) as PublicationView

    const res = await request(app, 'PATCH', `/marketing/publications/${pub.id}`, {
      body: { scheduledAt: null, version: scheduled.version },
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_PUBLICATION_STATE')
  })

  it('formato duplicado: dedupe na entrada; repetir com ativa → 409; cancelada libera', async () => {
    const { app } = buildTestApp()
    const content = await approvedContent(app)

    // Duplicado no MESMO pedido → dedupe (1 publicação, não 2).
    const first = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_reels', 'ig_reels'] },
    })
    expect(first.status).toBe(201)
    const created = (await first.json()) as PublicationView[]
    expect(created).toHaveLength(1)

    // Repetir com publicação ATIVA do formato → 409.
    const again = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_reels'] },
    })
    expect(again.status).toBe(409)

    // Cancelada não conta — recriar volta a valer.
    const [pub] = created as [PublicationView]
    await request(app, 'POST', `/marketing/publications/${pub.id}/cancel`)
    const recreate = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_reels'] },
    })
    expect(recreate.status).toBe(201)
  })
})
