import { describe, expect, test } from 'bun:test'
import { adminFunnel, adminLeads } from '../../src/server/admin'
import { createFakeRepo } from '../fakes/fake-db'

const CREDS = { user: 'admin', password: 'segredo' }

function req(auth?: { user: string; password: string }): Request {
  const headers: Record<string, string> = {}
  if (auth) headers.authorization = `Basic ${btoa(`${auth.user}:${auth.password}`)}`
  return new Request('http://localhost/api/admin', { headers })
}

describe('admin auth', () => {
  test('401 sem credenciais', async () => {
    const { repo } = createFakeRepo()
    const res = await adminFunnel(req(), { repo, ...CREDS })
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('Basic')
  })

  test('401 com senha errada', async () => {
    const { repo } = createFakeRepo()
    const res = await adminLeads(req({ user: 'admin', password: 'x' }), { repo, ...CREDS })
    expect(res.status).toBe(401)
  })
})

describe('adminFunnel', () => {
  test('agrega contagem e conversão por etapa', async () => {
    const { repo } = createFakeRepo()
    const a = await repo.createLead()
    const b = await repo.createLead()
    await repo.insertEvent(a.id, 'entrou_landing')
    await repo.insertEvent(b.id, 'entrou_landing')
    await repo.insertEvent(a.id, 'respondeu_pergunta_1')

    const res = await adminFunnel(req(CREDS), { repo, ...CREDS })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      total: number
      steps: Array<{ name: string; count: number; fromTop: number; fromPrev: number }>
    }
    expect(body.total).toBe(2)
    const landing = body.steps.find((s) => s.name === 'entrou_landing')
    const p1 = body.steps.find((s) => s.name === 'respondeu_pergunta_1')
    expect(landing?.count).toBe(2)
    expect(p1?.count).toBe(1)
    expect(p1?.fromTop).toBeCloseTo(0.5)
    expect(p1?.fromPrev).toBeCloseTo(0.5)
  })
})

describe('adminLeads', () => {
  test('lista os leads com auth', async () => {
    const { repo } = createFakeRepo()
    await repo.createLead()
    const res = await adminLeads(req(CREDS), { repo, ...CREDS })
    expect(res.status).toBe(200)
    expect(((await res.json()) as { leads: unknown[] }).leads).toHaveLength(1)
  })
})
