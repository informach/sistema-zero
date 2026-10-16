import { describe, expect, it } from 'bun:test'
import { chunkKnowledge } from '../../src/domain/kb/chunking'
import { buildTestApp, json, request, staffHeaders } from '../helpers'

describe('base de conhecimento', () => {
  it('CRUD completo de artigo', async () => {
    const { app, repos } = buildTestApp()

    const created = await request(app, 'POST', '/helpdesk/kb', {
      body: {
        title: 'Como acessar o curso',
        content: 'Passo a passo de acesso…',
        audience: 'customer_all',
        validUntil: '2099-01-01T00:00:00Z',
      },
    })
    expect(created.status).toBe(201)
    const article = await json(created)
    expect(article.published).toBe(false)

    const listed = await request(app, 'GET', '/helpdesk/kb')
    expect((await json(listed)).items).toHaveLength(1)

    const job = await repos.kb.claimIndex(new Date(), 60_000)
    if (!job?.indexLeaseToken) throw new Error('Job de índice ausente')
    await repos.kb.finishIndex(
      job.id,
      job.indexLeaseToken,
      chunkKnowledge(job.id, job.content, () => crypto.randomUUID()),
      new Date(),
    )
    const updated = await request(app, 'POST', `/helpdesk/kb/${article.id}/publish`, {
      headers: staffHeaders({ 'x-auth-user-role': 'admin' }),
      body: { revisionId: article.draftRevisionId, version: 0 },
    })
    expect(updated.status).toBe(200)
    expect((await json(updated)).published).toBe(true)

    const fetched = await request(app, 'GET', `/helpdesk/kb/${article.id}`)
    expect((await json(fetched)).version).toBe(1)

    const deleted = await request(app, 'POST', `/helpdesk/kb/${article.id}/archive`, {
      headers: staffHeaders({ 'x-auth-user-role': 'admin' }),
      body: { version: 1 },
    })
    expect(deleted.status).toBe(200)

    const gone = await request(app, 'GET', `/helpdesk/kb/${article.id}`)
    expect((await json(gone)).archived).toBe(true)
    expect((await json(await request(app, 'GET', '/helpdesk/kb'))).items).toHaveLength(0)
  })

  it('staff não publica e administrador não publica índice pendente', async () => {
    const { app } = buildTestApp()
    const article = await json(
      await request(app, 'POST', '/helpdesk/kb', {
        body: { title: 'Acesso', content: 'Instruções', validUntil: '2099-01-01T00:00:00Z' },
      }),
    )
    const body = { revisionId: article.draftRevisionId, version: 0 }
    expect(
      (await request(app, 'POST', `/helpdesk/kb/${article.id}/publish`, { body })).status,
    ).toBe(403)
    expect(
      (
        await request(app, 'POST', `/helpdesk/kb/${article.id}/publish`, {
          body,
          headers: staffHeaders({ 'x-auth-user-role': 'admin' }),
        })
      ).status,
    ).toBe(409)
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
