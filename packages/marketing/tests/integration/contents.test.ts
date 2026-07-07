import { describe, expect, it } from 'bun:test'
import type { ContentDetailView } from '../../src/application/mappers/views'
import { buildTestApp, request, type TestApp } from '../helpers'

async function createContent(
  app: TestApp['app'],
  body: Record<string, unknown> = {},
): Promise<ContentDetailView> {
  const res = await request(app, 'POST', '/marketing/contents', {
    body: { title: 'Reels de lançamento', contentType: 'reels', ...body },
  })
  expect(res.status).toBe(201)
  return (await res.json()) as ContentDetailView
}

/** Marca todos os itens do checklist como feitos (via API). */
async function completeChecklist(app: TestApp['app'], content: ContentDetailView): Promise<void> {
  for (const item of content.checklist) {
    const res = await request(app, 'PATCH', `/marketing/checklist/${item.id}`, {
      body: { done: true },
    })
    expect(res.status).toBe(200)
  }
}

describe('contents pipeline', () => {
  it('criar conteúdo copia o checklist do template do tipo', async () => {
    const { app } = buildTestApp()
    const content = await createContent(app)
    expect(content.stage).toBe('idea')
    expect(content.checklist.length).toBeGreaterThan(3)
    expect(content.checklist.every((i) => i.origin === 'template' && !i.done)).toBe(true)
  })

  it('mover no kanban registra evento; mover para etapa derivada → 409', async () => {
    const { app } = buildTestApp()
    const content = await createContent(app)

    const ok = await request(app, 'POST', `/marketing/contents/${content.id}/stage`, {
      body: { to: 'editing' },
    })
    expect(ok.status).toBe(200)
    const moved = (await ok.json()) as ContentDetailView
    expect(moved.stage).toBe('editing')
    expect(moved.stageEvents).toHaveLength(1)
    expect(moved.stageEvents[0]?.toStage).toBe('editing')

    const invalid = await request(app, 'POST', `/marketing/contents/${content.id}/stage`, {
      body: { to: 'published' },
    })
    expect(invalid.status).toBe(409)
  })

  it('aprovar com checklist incompleto → 409 CHECKLIST_INCOMPLETE', async () => {
    const { app } = buildTestApp()
    const content = await createContent(app)
    await request(app, 'POST', `/marketing/contents/${content.id}/stage`, {
      body: { to: 'review' },
    })
    const res = await request(app, 'POST', `/marketing/contents/${content.id}/stage`, {
      body: { to: 'approved' },
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('CHECKLIST_INCOMPLETE')
  })

  it('checklist completo libera a aprovação (item feito guarda autor)', async () => {
    const { app } = buildTestApp()
    const content = await createContent(app)
    await completeChecklist(app, content)
    const res = await request(app, 'POST', `/marketing/contents/${content.id}/stage`, {
      body: { to: 'approved' },
    })
    expect(res.status).toBe(200)
    const approved = (await res.json()) as ContentDetailView
    expect(approved.stage).toBe('approved')
    expect(approved.checklist.every((i) => i.done && i.doneByName === 'Helena')).toBe(true)
  })

  it('edição com versão defasada → 409 (concorrência otimista)', async () => {
    const { app } = buildTestApp()
    const content = await createContent(app)
    const first = await request(app, 'PATCH', `/marketing/contents/${content.id}`, {
      body: { title: 'Novo título', version: content.version },
    })
    expect(first.status).toBe(200)
    const stale = await request(app, 'PATCH', `/marketing/contents/${content.id}`, {
      body: { title: 'Perdedor da corrida', version: content.version },
    })
    expect(stale.status).toBe(409)
  })

  it('comentários e itens manuais de checklist', async () => {
    const { app } = buildTestApp()
    const content = await createContent(app)
    const comment = await request(app, 'POST', `/marketing/contents/${content.id}/comments`, {
      body: { body: 'Trocar o gancho da abertura' },
    })
    expect(comment.status).toBe(201)
    const item = await request(app, 'POST', `/marketing/contents/${content.id}/checklist`, {
      body: { label: 'Pedir aprovação do jurídico' },
    })
    expect(item.status).toBe(201)
    const detail = await request(app, 'GET', `/marketing/contents/${content.id}`)
    const view = (await detail.json()) as ContentDetailView
    expect(view.comments).toHaveLength(1)
    expect(view.comments[0]?.authorName).toBe('Helena')
    expect(view.checklist.some((i) => i.origin === 'manual')).toBe(true)
  })

  it('promover ideia vira conteúdo e arquiva a ideia', async () => {
    const { app } = buildTestApp()
    const ideaRes = await request(app, 'POST', '/marketing/ideas', {
      body: { title: 'Bastidores da aula nova', notes: 'Mostrar o making of' },
    })
    expect(ideaRes.status).toBe(201)
    const idea = (await ideaRes.json()) as { id: string }
    const promoted = await request(app, 'POST', `/marketing/ideas/${idea.id}/promote`, {
      body: { contentType: 'reels' },
    })
    expect(promoted.status).toBe(201)
    const content = (await promoted.json()) as ContentDetailView
    expect(content.title).toBe('Bastidores da aula nova')
    expect(content.brief).toBe('Mostrar o making of')
    expect(content.ideaId).toBe(idea.id)

    const list = await request(app, 'GET', '/marketing/ideas?status=accepted')
    const ideas = (await list.json()) as { items: { id: string; promotedContentId: string }[] }
    expect(ideas.items[0]?.promotedContentId).toBe(content.id)
  })
})

describe('contents: cancelamento em cascata e contagens', () => {
  it('cancelar conteúdo cancela junto as publicações agendadas/rascunho', async () => {
    const { app } = buildTestApp()
    const content = await createContent(app)
    await completeChecklist(app, content)
    await request(app, 'POST', `/marketing/contents/${content.id}/stage`, {
      body: { to: 'approved' },
    })
    const createRes = await request(app, 'POST', `/marketing/contents/${content.id}/publications`, {
      body: { formats: ['ig_reels', 'yt_short'] },
    })
    const pubs = (await createRes.json()) as Array<{ id: string }>
    const [first] = pubs as [{ id: string }]
    await request(app, 'POST', `/marketing/publications/${first.id}/schedule`, {
      body: { scheduledAt: new Date(Date.now() + 3_600_000).toISOString() },
    })

    const cancel = await request(app, 'POST', `/marketing/contents/${content.id}/cancel`)
    expect(cancel.status).toBe(200)
    const detail = (await cancel.json()) as ContentDetailView
    expect(detail.stage).toBe('canceled')
    // Nenhuma publicação fica viva — senão o lembrete/publisher (F1+)
    // dispararia para conteúdo cancelado.
    expect(detail.publications).toHaveLength(2)
    expect(detail.publications.every((p) => p.status === 'canceled')).toBe(true)
  })

  it('stage-counts agrega TODAS as etapas no banco (painel não pagina)', async () => {
    const { app } = buildTestApp()
    const a = await createContent(app)
    await createContent(app, { title: 'Carrossel de dicas', contentType: 'carousel' })
    await request(app, 'POST', `/marketing/contents/${a.id}/stage`, { body: { to: 'editing' } })

    const res = await request(app, 'GET', '/marketing/contents/stage-counts')
    expect(res.status).toBe(200)
    const { counts } = (await res.json()) as { counts: Record<string, number> }
    expect(counts.idea).toBe(1)
    expect(counts.editing).toBe(1)
    expect(counts.script).toBe(0)
    expect(counts.published).toBe(0)
  })
})

export { completeChecklist, createContent }
