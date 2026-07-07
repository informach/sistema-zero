import { describe, expect, it } from 'bun:test'
import type { ContentDetailView, IdeaView } from '../../src/application/mappers/views'
import { buildTestApp, request, type TestApp } from '../helpers'

async function createIdea(
  app: TestApp['app'],
  body: Record<string, unknown> = {},
): Promise<IdeaView> {
  const res = await request(app, 'POST', '/marketing/ideas', {
    body: { title: 'Bastidores da gravação', notes: 'Mostrar o setup', ...body },
  })
  expect(res.status).toBe(201)
  return (await res.json()) as IdeaView
}

describe('ideas (inbox → promoção)', () => {
  it('promover cria o conteúdo com o briefing e arquiva a ideia (accepted + ponteiro)', async () => {
    const { app, repos } = buildTestApp()
    const idea = await createIdea(app)
    const res = await request(app, 'POST', `/marketing/ideas/${idea.id}/promote`, {
      body: { contentType: 'reels' },
    })
    expect(res.status).toBe(201)
    const content = (await res.json()) as ContentDetailView
    expect(content.title).toBe(idea.title)
    expect(content.brief).toBe(idea.notes)

    const stored = repos.ideas.rows.get(idea.id)
    expect(stored?.status).toBe('accepted')
    expect(stored?.promotedContentId).toBe(content.id)
  })

  it('promover uma ideia já promovida → 409 IDEA_NOT_PROMOTABLE (sem segundo conteúdo)', async () => {
    const { app, repos } = buildTestApp()
    const idea = await createIdea(app)
    await request(app, 'POST', `/marketing/ideas/${idea.id}/promote`, {
      body: { contentType: 'reels' },
    })
    const again = await request(app, 'POST', `/marketing/ideas/${idea.id}/promote`, {
      body: { contentType: 'carousel' },
    })
    expect(again.status).toBe(409)
    const body = (await again.json()) as { error: { code: string } }
    expect(body.error.code).toBe('IDEA_NOT_PROMOTABLE')
    expect(repos.contents.rows.size).toBe(1)
  })

  it('ideia descartada não se promove; inbox ↔ discarded anda pelo PATCH', async () => {
    const { app } = buildTestApp()
    const idea = await createIdea(app)

    const discard = await request(app, 'PATCH', `/marketing/ideas/${idea.id}`, {
      body: { status: 'discarded' },
    })
    expect(discard.status).toBe(200)

    const promote = await request(app, 'POST', `/marketing/ideas/${idea.id}/promote`, {
      body: { contentType: 'reels' },
    })
    expect(promote.status).toBe(409)

    const restore = await request(app, 'PATCH', `/marketing/ideas/${idea.id}`, {
      body: { status: 'inbox' },
    })
    expect(restore.status).toBe(200)
    expect(((await restore.json()) as IdeaView).status).toBe('inbox')
  })

  it('PATCH não "aceita" ideia na mão (accepted é exclusivo da promoção) → 409', async () => {
    const { app } = buildTestApp()
    const idea = await createIdea(app)
    const res = await request(app, 'PATCH', `/marketing/ideas/${idea.id}`, {
      body: { status: 'accepted' },
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_IDEA_STATUS_CHANGE')
  })

  it('ideia promovida é arquivo: não volta ao inbox pelo PATCH → 409', async () => {
    const { app } = buildTestApp()
    const idea = await createIdea(app)
    await request(app, 'POST', `/marketing/ideas/${idea.id}/promote`, {
      body: { contentType: 'reels' },
    })
    const res = await request(app, 'PATCH', `/marketing/ideas/${idea.id}`, {
      body: { status: 'inbox' },
    })
    expect(res.status).toBe(409)
  })
})
