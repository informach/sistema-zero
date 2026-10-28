import { beforeEach, expect, mock, test } from 'bun:test'
import type { SessionUser } from '../../src/lib/types'
import type { CallOpts, GatewayResponse } from '../../src/server/gateway'

mock.module('server-only', () => ({}))
const originalHeaders = { ...(await import('next/headers')) }
const originalGateway = { ...(await import('../../src/server/gateway')) }
const originalSession = { ...(await import('../../src/server/session')) }
let requestHeaders: Headers
let authenticated = true
let user: SessionUser
let calls: { path: string; options: CallOpts }[] = []
let upstream: GatewayResponse
mock.module('next/headers', () => ({ ...originalHeaders, headers: async () => requestHeaders }))
mock.module('../../src/server/session', () => ({
  ...originalSession,
  getAccessToken: async () => (authenticated ? 'test-access' : null),
  getRefreshToken: async () => (authenticated ? 'test-refresh' : null),
  verifyAccessToken: async () => ({ ok: true, user }),
}))
mock.module('../../src/server/gateway', () => ({
  ...originalGateway,
  gatewayFetch: async (path: string, options: CallOpts) => {
    calls.push({ path, options })
    return upstream
  },
}))
const route = await import('../../src/app/api/arquipelago/[...path]/route')
const id = '11111111-1111-4111-8111-111111111111'
beforeEach(() => {
  authenticated = true
  user = {
    id,
    email: 'admin@example.test',
    firstName: 'Ana',
    lastName: 'Teste',
    role: 'admin',
    status: 'active',
  }
  requestHeaders = new Headers({
    host: 'admin.test',
    origin: 'https://admin.test',
    'sec-fetch-site': 'same-origin',
  })
  calls = []
  upstream = { status: 200, body: { ok: true } }
})
const invoke = (action = 'publicar') =>
  route.POST(
    new Request(`https://admin.test/api/arquipelago/desafios/${id}/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revisaoBase: 2 }),
    }),
    { params: Promise.resolve({ path: ['desafios', id, action] }) },
  )
test('sem sessão e origem cruzada não chegam ao serviço', async () => {
  authenticated = false
  expect((await invoke()).status).toBe(401)
  authenticated = true
  requestHeaders.set('sec-fetch-site', 'cross-site')
  expect((await invoke()).status).toBe(403)
  expect(calls).toHaveLength(0)
})
test('staff pode analisar, mas não publicar; conta inativa também não escreve', async () => {
  user.role = 'staff'
  expect((await invoke()).status).toBe(403)
  expect(calls).toHaveLength(0)
  expect((await invoke('analisar')).status).toBe(200)
  expect(calls).toHaveLength(1)
  user.role = 'admin'
  user.status = 'suspended'
  expect((await invoke()).status).toBe(403)
  expect(calls).toHaveLength(1)
})
test('admin encaminha revisão, deadline e cancelamento; rota desconhecida é recusada', async () => {
  const response = await invoke()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(calls[0]).toMatchObject({
    path: `/arquipelago/admin/desafios/${id}/publicar`,
    options: { method: 'POST', body: { revisaoBase: 2 }, timeoutMs: 170_000 },
  })
  expect(calls[0]?.options.signal).toBeInstanceOf(AbortSignal)
  expect((await invoke('apagar-tudo')).status).toBe(400)
  expect(calls).toHaveLength(1)
})
