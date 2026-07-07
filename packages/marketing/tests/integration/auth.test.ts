import { describe, expect, it } from 'bun:test'
import { buildTestApp, INTERNAL_TOKEN, request, staffHeaders } from '../helpers'

describe('auth fail-closed', () => {
  it('sem x-internal-token → 401', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/marketing/ideas', {
      headers: { ...staffHeaders(), 'x-internal-token': '' },
    })
    expect(res.status).toBe(401)
  })

  it('token interno errado → 401', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/marketing/ideas', {
      headers: { ...staffHeaders(), 'x-internal-token': 'wrong-token-wrong-token' },
    })
    expect(res.status).toBe(401)
  })

  it('sem identidade (não passou pela borda) → 401', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/marketing/ideas', {
      headers: { 'content-type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
    })
    expect(res.status).toBe(401)
  })

  it('role customer → 403 (ferramenta é da equipe)', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/marketing/ideas', {
      headers: staffHeaders({ 'x-auth-user-role': 'customer' }),
    })
    expect(res.status).toBe(403)
  })

  it('conta inativa → 403', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/marketing/ideas', {
      headers: staffHeaders({ 'x-auth-user-status': 'inactive' }),
    })
    expect(res.status).toBe(403)
  })

  it('staff ativo → 200', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/marketing/ideas')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    expect(body.items).toEqual([])
  })

  it('id fora do formato uuid → 400 (nunca 22P02→500)', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/marketing/contents/nao-e-uuid')
    expect(res.status).toBe(400)
  })
})
