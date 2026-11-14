import { expect, test } from 'bun:test'
import { createMoradaHouse } from '@sistemazero/core/morada'
import { MORADA_LIMITS } from '@sistemazero/core/morada/schema'
import { createMoradaHouseRoutes } from '../src/routes/morada-house'

function setup(user: unknown = { id: 'member' }, audience: 'kids' | 'adult' = 'kids') {
  const calls: { path: string; options: unknown }[] = []
  const current = { house: createMoradaHouse(), revision: 4, owned: [] }
  const routes = createMoradaHouseRoutes({ getSession: async () => user, audience } as never, {
    gatewayFetch: async <T>(path: string, options?: unknown) => {
      calls.push({ path, options })
      return { status: 409, body: { current } as T }
    },
  })
  return { routes, calls, current }
}

const request = (body: unknown) =>
  new Request('http://localhost/api/members/house', { method: 'PUT', body: JSON.stringify(body) })

test('house exige sessão e bloqueia suporte somente leitura antes de acessar o serviço', async () => {
  const anonymous = setup(null)
  expect((await anonymous.routes.GET()).status).toBe(401)
  expect((await anonymous.routes.PUT(request({}))).status).toBe(401)
  expect(anonymous.calls).toHaveLength(0)
  const support = setup({ id: 'member', act: { sub: 'admin', mode: 'readonly' } })
  expect((await support.routes.PUT(request({}))).status).toBe(403)
  expect(support.calls).toHaveLength(0)
})

test('house preserva revisão, escopo, público e documento atual em conflito sem cache', async () => {
  for (const audience of ['kids', 'adult'] as const) {
    const { routes, calls, current } = setup(undefined, audience)
    const body = { house: createMoradaHouse(), revision: 3, scope: 'room' }
    const result = await routes.PUT(request(body))
    expect(result.status).toBe(409)
    expect(await result.json()).toEqual(JSON.parse(JSON.stringify({ current })))
    expect(result.headers.get('cache-control')).toBe('private, no-store')
    expect(JSON.parse(JSON.stringify(calls))).toEqual(
      JSON.parse(
        JSON.stringify([
          { path: '/members/house', options: { method: 'PUT', query: { audience }, body } },
        ]),
      ),
    )
    await routes.GET()
    expect(calls[1]).toEqual({ path: '/members/house', options: { query: { audience } } })
  }
})

test('house recusa JSON inválido, identidade injetada e corpo excessivo antes do gateway', async () => {
  const { routes, calls } = setup()
  const malformed = new Request('http://localhost', { method: 'PUT', body: '{' })
  expect((await routes.PUT(malformed)).status).toBe(400)
  expect(
    (await routes.PUT(request({ house: createMoradaHouse(), revision: 0, userId: 'other' })))
      .status,
  ).toBe(400)
  expect((await routes.PUT(request('x'.repeat(MORADA_LIMITS.bytes + 1024)))).status).toBe(413)
  expect(calls).toHaveLength(0)
})
