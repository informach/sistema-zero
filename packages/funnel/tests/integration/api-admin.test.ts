import { describe, expect, test } from 'bun:test'
import { ADMIN_COOKIE, createAdminSessionCookie } from '../../src/lib/admin-session'
import { adminFunnel, adminLeads, adminLogin, adminLogout } from '../../src/server/admin'
import { createFakeRepo } from '../fakes/fake-db'

const BASE = {
  user: 'admin',
  password: 'segredo',
  sessionSecret: 'test_admin_session_secret_0123456789',
  secureCookie: false,
}
const deps = (repo: ReturnType<typeof createFakeRepo>['repo']) => ({ repo, ...BASE })

/** Cookie de sessão válido (só o par `admin_session=<token>`) para os GETs. */
const authCookie = () => createAdminSessionCookie(BASE.sessionSecret, false).split(';')[0] ?? ''

function jsonReq(body?: unknown): Request {
  return new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
function getReq(cookie?: string): Request {
  const headers: Record<string, string> = {}
  if (cookie) headers.cookie = cookie
  return new Request('http://localhost/api/admin', { headers })
}

describe('adminLogin', () => {
  test('200 e seta cookie de sessão com credenciais corretas', async () => {
    const { repo } = createFakeRepo()
    const res = await adminLogin(jsonReq({ usuario: 'admin', senha: 'segredo' }), deps(repo))
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain(`${ADMIN_COOKIE}=`)
    expect(setCookie).toContain('HttpOnly')
  })

  test('401 com senha errada', async () => {
    const { repo } = createFakeRepo()
    const res = await adminLogin(jsonReq({ usuario: 'admin', senha: 'x' }), deps(repo))
    expect(res.status).toBe(401)
  })

  test('400 com payload inválido', async () => {
    const { repo } = createFakeRepo()
    const res = await adminLogin(jsonReq({ usuario: 'admin' }), deps(repo))
    expect(res.status).toBe(400)
  })
})

describe('adminLogout', () => {
  test('200 e limpa o cookie', () => {
    const { repo } = createFakeRepo()
    const res = adminLogout(getReq(), deps(repo))
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie') ?? '').toContain('Max-Age=0')
  })
})

describe('admin auth (sessão por cookie)', () => {
  test('401 sem cookie de sessão', async () => {
    const { repo } = createFakeRepo()
    const res = await adminFunnel(getReq(), deps(repo))
    expect(res.status).toBe(401)
  })

  test('401 com cookie assinado por outro segredo', async () => {
    const { repo } = createFakeRepo()
    const intruso = createAdminSessionCookie('outro-segredo-aaaaaaaaaaaaaaaa', false).split(';')[0]
    const res = await adminLeads(getReq(intruso), deps(repo))
    expect(res.status).toBe(401)
  })
})

describe('adminFunnel', () => {
  test('agrega contagem e conversão por etapa (com sessão)', async () => {
    const { repo } = createFakeRepo()
    const a = await repo.createLead()
    const b = await repo.createLead()
    await repo.insertEvent(a.id, 'entrou_landing')
    await repo.insertEvent(b.id, 'entrou_landing')
    await repo.insertEvent(a.id, 'respondeu_pergunta_1')

    const res = await adminFunnel(getReq(authCookie()), deps(repo))
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
  test('lista os leads com sessão', async () => {
    const { repo } = createFakeRepo()
    await repo.createLead()
    const res = await adminLeads(getReq(authCookie()), deps(repo))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { leads: unknown[] }).leads).toHaveLength(1)
  })
})
