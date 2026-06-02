import { describe, expect, test } from 'bun:test'
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from '../../src/lib/admin-auth'
import { adminFunnel, adminLeads, adminLogin, adminLogout } from '../../src/server/admin'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway, type FakeGatewayState } from '../fakes/fake-gateway'

function setup() {
  const { repo } = createFakeRepo()
  const fg = createFakeGateway()
  const deps = { repo, gateway: fg.gateway, secureCookie: false }
  return { repo, fg, deps }
}

function loginReq(body?: unknown): Request {
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
/** Cookie de sessão válido (access token do auth falso). */
const accessCookie = (fg: FakeGatewayState) => `${ADMIN_ACCESS_COOKIE}=${fg.auth.access}`

describe('adminLogin', () => {
  test('200 e seta cookies access+refresh (HttpOnly) com credenciais de admin', async () => {
    const { fg, deps } = setup()
    const res = await adminLogin(
      loginReq({ email: fg.auth.email, password: fg.auth.password }),
      deps,
    )
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie()
    expect(cookies.some((c) => c.startsWith(`${ADMIN_ACCESS_COOKIE}=${fg.auth.access}`))).toBe(true)
    expect(cookies.some((c) => c.startsWith(`${ADMIN_REFRESH_COOKIE}=`))).toBe(true)
    expect(cookies.every((c) => c.includes('HttpOnly'))).toBe(true)
  })

  test('401 com senha errada', async () => {
    const { fg, deps } = setup()
    const res = await adminLogin(loginReq({ email: fg.auth.email, password: 'errada' }), deps)
    expect(res.status).toBe(401)
  })

  test('400 com payload inválido', async () => {
    const { deps } = setup()
    const res = await adminLogin(loginReq({ email: 'nao-eh-email' }), deps)
    expect(res.status).toBe(400)
  })

  test('403 quando a conta não tem papel de admin', async () => {
    const { fg, deps } = setup()
    fg.setAuthUser({ role: 'customer' })
    const res = await adminLogin(
      loginReq({ email: fg.auth.email, password: fg.auth.password }),
      deps,
    )
    expect(res.status).toBe(403)
  })
})

describe('adminLogout', () => {
  test('200, limpa os cookies e revoga o refresh no auth', async () => {
    const { fg, deps } = setup()
    const req = new Request('http://localhost/api/admin/logout', {
      method: 'POST',
      headers: { cookie: `${ADMIN_REFRESH_COOKIE}=${fg.auth.refresh}` },
    })
    const res = await adminLogout(req, deps)
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie()
    expect(cookies.every((c) => c.includes('Max-Age=0'))).toBe(true)
    expect(fg.calls.logout).toContain(fg.auth.refresh)
  })
})

describe('admin auth (sessão via /auth/me)', () => {
  test('401 sem cookie de sessão', async () => {
    const { deps } = setup()
    const res = await adminFunnel(getReq(), deps)
    expect(res.status).toBe(401)
  })

  test('401 com access token inválido e sem refresh', async () => {
    const { deps } = setup()
    const res = await adminLeads(getReq(`${ADMIN_ACCESS_COOKIE}=token-invalido`), deps)
    expect(res.status).toBe(401)
  })

  test('renova via refresh quando o access expira e seta novos cookies', async () => {
    const { repo, fg, deps } = setup()
    await repo.createLead()
    const res = await adminLeads(getReq(`${ADMIN_REFRESH_COOKIE}=${fg.auth.refresh}`), deps)
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie()
    expect(cookies.some((c) => c.startsWith(`${ADMIN_ACCESS_COOKIE}=`))).toBe(true)
  })
})

describe('adminFunnel', () => {
  test('agrega contagem e conversão por etapa (com sessão)', async () => {
    const { repo, fg, deps } = setup()
    const a = await repo.createLead()
    const b = await repo.createLead()
    await repo.insertEvent(a.id, 'entrou_landing')
    await repo.insertEvent(b.id, 'entrou_landing')
    await repo.insertEvent(a.id, 'respondeu_pergunta_1')

    const res = await adminFunnel(getReq(accessCookie(fg)), deps)
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
    const { repo, fg, deps } = setup()
    await repo.createLead()
    const res = await adminLeads(getReq(accessCookie(fg)), deps)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { leads: unknown[] }).leads).toHaveLength(1)
  })
})
