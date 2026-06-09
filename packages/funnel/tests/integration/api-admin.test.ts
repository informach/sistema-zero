import { describe, expect, test } from 'bun:test'
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from '../../src/lib/admin-auth'
import {
  adminFunnel,
  adminLeads,
  adminLogin,
  adminLogout,
  adminPerfis,
} from '../../src/server/admin'
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
/** GET /api/admin/leads com query string (ex.: `?limit=25&offset=25`). */
const leadsReq = (fg: FakeGatewayState, query = ''): Request =>
  new Request(`http://localhost/api/admin/leads${query}`, { headers: { cookie: accessCookie(fg) } })

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
  test('lista os leads com sessão (com total)', async () => {
    const { repo, fg, deps } = setup()
    await repo.createLead()
    const res = await adminLeads(getReq(accessCookie(fg)), deps)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { leads: unknown[]; total: number }
    expect(body.leads).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  test('pagina por limit/offset e devolve o total', async () => {
    const { repo, fg, deps } = setup()
    for (let i = 0; i < 30; i++) await repo.createLead()

    const page1 = (await (await adminLeads(leadsReq(fg, '?limit=25&offset=0'), deps)).json()) as {
      leads: unknown[]
      total: number
      limit: number
      offset: number
    }
    expect(page1.total).toBe(30)
    expect(page1.leads).toHaveLength(25)
    expect(page1.limit).toBe(25)
    expect(page1.offset).toBe(0)

    const page2 = (await (await adminLeads(leadsReq(fg, '?limit=25&offset=25'), deps)).json()) as {
      leads: unknown[]
    }
    expect(page2.leads).toHaveLength(5)
  })

  test('busca por nome/e-mail filtra o total (server-side)', async () => {
    const { repo, fg, deps } = setup()
    const a = await repo.createLead()
    const b = await repo.createLead()
    await repo.updateLead(a.id, { nome: 'Maria Silva', email: 'maria@example.com' })
    await repo.updateLead(b.id, { nome: 'João Souza', email: 'joao@example.com' })

    const res = await adminLeads(leadsReq(fg, '?q=maria'), deps)
    const body = (await res.json()) as { leads: { id: string }[]; total: number }
    expect(body.total).toBe(1)
    expect(body.leads).toHaveLength(1)
    expect(body.leads[0]?.id).toBe(a.id)
  })

  test('clampa o limit acima do teto (100)', async () => {
    const { fg, deps } = setup()
    const body = (await (await adminLeads(leadsReq(fg, '?limit=9999'), deps)).json()) as {
      limit: number
    }
    expect(body.limit).toBe(100)
  })
})

describe('adminPerfis', () => {
  test('401 sem sessão', async () => {
    const { deps } = setup()
    const res = await adminPerfis(getReq(), deps)
    expect(res.status).toBe(401)
  })

  test('conta leads por perfil (sempre os 4, na ordem canônica) e o total', async () => {
    const { repo, fg, deps } = setup()
    const a = await repo.createLead()
    const b = await repo.createLead()
    const c = await repo.createLead()
    await repo.createLead() // sem perfil → não conta
    await repo.updateLead(a.id, { perfilResultado: 'ideia_parada' })
    await repo.updateLead(b.id, { perfilResultado: 'ideia_parada' })
    await repo.updateLead(c.id, { perfilResultado: 'sem_criterio' })

    const res = await adminPerfis(getReq(accessCookie(fg)), deps)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      total: number
      counts: Array<{ perfil: string; label: string; count: number }>
    }
    expect(body.total).toBe(3)
    expect(body.counts.map((c) => c.perfil)).toEqual([
      'ideia_parada',
      'criando_no_escuro',
      'refem_ajustes',
      'sem_criterio',
    ])
    const byPerfil = new Map(body.counts.map((c) => [c.perfil, c.count]))
    expect(byPerfil.get('ideia_parada')).toBe(2)
    expect(byPerfil.get('sem_criterio')).toBe(1)
    expect(byPerfil.get('criando_no_escuro')).toBe(0)
  })
})
