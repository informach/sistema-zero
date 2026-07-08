import { describe, expect, it } from 'bun:test'
import { buildTestApp, json, request } from '../helpers'

describe('base de conhecimento', () => {
  it('CRUD completo de artigo', async () => {
    const { app } = buildTestApp()

    const created = await request(app, 'POST', '/helpdesk/kb', {
      body: { title: 'Como acessar o curso', content: 'Passo a passo de acesso…' },
    })
    expect(created.status).toBe(201)
    const article = await json(created)
    expect(article.published).toBe(false)

    const listed = await request(app, 'GET', '/helpdesk/kb')
    expect((await json(listed)).items).toHaveLength(1)

    const updated = await request(app, 'PATCH', `/helpdesk/kb/${article.id}`, {
      body: { published: true, version: 0 },
    })
    expect(updated.status).toBe(200)
    expect((await json(updated)).published).toBe(true)

    const fetched = await request(app, 'GET', `/helpdesk/kb/${article.id}`)
    expect((await json(fetched)).version).toBe(1)

    const deleted = await request(app, 'DELETE', `/helpdesk/kb/${article.id}`)
    expect(deleted.status).toBe(204)

    const gone = await request(app, 'GET', `/helpdesk/kb/${article.id}`)
    expect(gone.status).toBe(404)
  })

  it('PATCH com version defasada → 409', async () => {
    const { app } = buildTestApp()
    const created = await request(app, 'POST', '/helpdesk/kb', {
      body: { title: 'Artigo', content: 'Conteúdo' },
    })
    const article = await json(created)

    await request(app, 'PATCH', `/helpdesk/kb/${article.id}`, {
      body: { title: 'Novo título', version: 0 },
    })
    const stale = await request(app, 'PATCH', `/helpdesk/kb/${article.id}`, {
      body: { title: 'Outro título', version: 0 },
    })
    expect(stale.status).toBe(409)
  })

  it('valida corpo (título vazio → 400)', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'POST', '/helpdesk/kb', {
      body: { title: '', content: 'Conteúdo' },
    })
    expect(res.status).toBe(400)
  })
})
