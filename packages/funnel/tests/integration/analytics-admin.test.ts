import { expect, test } from 'bun:test'
import { adminAnalytics } from '../../src/analytics/admin'
import { createFakeGateway } from '../fakes/fake-gateway'

test('relatório exige admin e preserva renovação da sessão nos erros sem cache', async () => {
  const fake = createFakeGateway()
  let accessed = false
  const deps = {
    gateway: fake.gateway,
    secure: false,
    log: () => {},
    db: () => {
      accessed = true
      throw new Error('database unavailable')
    },
  }
  const req = (query: string, cookie = '') =>
    new Request(`http://localhost/api/admin/analytics?${query}`, { headers: { cookie } })
  const anonymous = await adminAnalytics(req(''), deps)
  expect(anonymous.status).toBe(401)
  expect(anonymous.headers.get('cache-control')).toBe('no-store')
  expect(accessed).toBe(false)
  const invalid = await adminAnalytics(
    req('from=invalid', `admin_refresh=${fake.auth.refresh}`),
    deps,
  )
  expect(invalid.status).toBe(400)
  expect(invalid.headers.getSetCookie()).toHaveLength(2)
  expect(accessed).toBe(false)
  const unavailable = await adminAnalytics(
    req('from=2026-10-01&to=2026-10-03', `admin_refresh=${fake.auth.refresh}`),
    deps,
  )
  expect(unavailable.status).toBe(503)
  expect(unavailable.headers.getSetCookie()).toHaveLength(2)
  expect(unavailable.headers.get('cache-control')).toBe('no-store')
  fake.setAuthUser({ role: 'customer' })
  expect(
    (
      await adminAnalytics(
        req('from=2026-10-01&to=2026-10-03', `admin_access=${fake.auth.access}`),
        deps,
      )
    ).status,
  ).toBe(401)
})

test('filtro incompleto de mapa é recusado antes de consultar o banco', async () => {
  const fake = createFakeGateway()
  const response = await adminAnalytics(
    new Request('http://localhost/api/admin/analytics?from=2026-10-01&to=2026-10-03&viewport=390', {
      headers: { cookie: `admin_access=${fake.auth.access}` },
    }),
    {
      gateway: fake.gateway,
      secure: false,
      db: () => {
        throw new Error('must not query')
      },
      log: () => {},
    },
  )
  expect(response.status).toBe(400)
})
