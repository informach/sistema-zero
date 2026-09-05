import { describe, expect, it } from 'bun:test'
import { buildTestApp, json, request } from '../helpers'

describe('configurações', () => {
  it('GET expõe apenas a assinatura usada nas respostas humanas', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/settings')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.signature).toBe('')
    expect(body.autoReplyEnabled).toBeUndefined()
  })

  it('ignora o campo legado removido de auto-resposta', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'PATCH', '/helpdesk/settings', {
      body: {
        autoReplyEnabled: true,
      },
    })
    expect(res.status).toBe(200)
    expect((await json(res)).autoReplyEnabled).toBeUndefined()
  })

  it('atualiza a assinatura e ignora campos removidos de clientes legados', async () => {
    const { app } = buildTestApp()
    const updated = await request(app, 'PATCH', '/helpdesk/settings', {
      body: { signature: 'Equipe Sistema Zero' },
    })
    expect(updated.status).toBe(200)
    expect((await json(updated)).signature).toBe('Equipe Sistema Zero')

    const removedField = await request(app, 'PATCH', '/helpdesk/settings', {
      body: { autoReplyCategories: ['curso_acesso'] },
    })
    expect(removedField.status).toBe(200)
    expect((await json(removedField)).autoReplyCategories).toBeUndefined()
  })
})
