import { describe, expect, it } from 'bun:test'
import { buildTestApp, request, staffHeaders } from '../helpers'

describe('auth (defesa em profundidade)', () => {
  it('rejeita chamada sem x-internal-token', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets', {
      headers: { 'content-type': 'application/json' },
    })
    expect(res.status).toBe(401)
  })

  it('rejeita x-internal-token errado', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets', {
      headers: staffHeaders({ 'x-internal-token': 'token-invalido-9999' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejeita usuário sem papel de equipe', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets', {
      headers: staffHeaders({ 'x-auth-user-role': 'student' }),
    })
    expect(res.status).toBe(403)
  })

  it('rejeita conta inativa', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets', {
      headers: staffHeaders({ 'x-auth-user-status': 'suspended' }),
    })
    expect(res.status).toBe(403)
  })

  it('rejeita chamada sem identidade (só token interno)', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets', {
      headers: {
        'content-type': 'application/json',
        'x-internal-token': 'test-internal-token-1234',
      },
    })
    expect(res.status).toBe(401)
  })

  it('aceita staff ativo vindo do gateway', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets')
    expect(res.status).toBe(200)
  })

  it('health e readyz são públicos', async () => {
    const { app } = buildTestApp()
    const health = await app.handle(new Request('http://localhost/health'))
    const ready = await app.handle(new Request('http://localhost/readyz'))
    expect(health.status).toBe(200)
    expect(ready.status).toBe(200)
  })
})
