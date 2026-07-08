import { describe, expect, it } from 'bun:test'
import { buildTestApp, json, request } from '../helpers'

describe('configurações', () => {
  it('GET devolve os defaults (auto-resposta DESLIGADA)', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/settings')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.autoReplyEnabled).toBe(false)
    expect(body.autoReplyCategories).toEqual([])
    expect(body.autoReplyConfidenceMin).toBe(0.75)
  })

  it('PATCH liga a auto-resposta por categoria com dedupe', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'PATCH', '/helpdesk/settings', {
      body: {
        autoReplyEnabled: true,
        autoReplyCategories: ['curso_acesso', 'curso_acesso', 'outro'],
        autoReplyConfidenceMin: 0.9,
        signature: 'Equipe Sistema Zero',
      },
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.autoReplyEnabled).toBe(true)
    expect(body.autoReplyCategories).toEqual(['curso_acesso', 'outro'])
    expect(body.autoReplyConfidenceMin).toBe(0.9)
    expect(body.signature).toBe('Equipe Sistema Zero')

    const persisted = await request(app, 'GET', '/helpdesk/settings')
    expect((await json(persisted)).autoReplyEnabled).toBe(true)
  })

  it('rejeita categoria fora do enum', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'PATCH', '/helpdesk/settings', {
      body: { autoReplyCategories: ['categoria_inexistente'] },
    })
    expect(res.status).toBe(400)
  })
})
