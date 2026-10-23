import { describe, expect, mock, test } from 'bun:test'
import type { SessionUser } from '../src/lib/types'

mock.module('server-only', () => ({}))
const { createShellRoutes } = await import('../src/routes')
const { createProfilesClient } = await import('../src/server/clients')
const requestId = '11111111-1111-4111-8111-111111111111'
const user: SessionUser = {
  id: 'parent',
  email: '',
  firstName: 'Responsável',
  lastName: '',
  role: 'customer',
  status: 'active',
}
const values = {
  name: 'Criança de teste',
  birthDate: null,
  publicProfileEnabled: false,
  voiceInputEnabled: false,
}
function setup() {
  const calls: Array<{ path: string; body: unknown }> = []
  const profiles = createProfilesClient({
    gatewayFetch: async (path: string, options: { body: unknown }) => {
      calls.push({ path, body: options.body })
      return { status: 201, body: { profile: { id: 'new-profile' } } }
    },
  } as never)
  const routes = createShellRoutes({ session: { getSession: async () => user }, profiles } as never)
  const request = (body: unknown) =>
    routes.profileCreate.POST(
      new Request('https://kids.test/api/profiles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  return { calls, request }
}
describe('identidade do pedido atravessa o BFF e o client Auth', () => {
  test('preserva o UUID e os consentimentos até /auth/profiles', async () => {
    const { calls, request } = setup()
    const body = { requestId, ...values }
    expect((await request(body)).status).toBe(201)
    expect(calls).toEqual([{ path: '/auth/profiles', body }])
  })
  test.each([
    undefined,
    '',
    'not-a-uuid',
  ])('recusa identificador inválido %s antes do upstream', async (id) => {
    const { calls, request } = setup()
    expect(
      (await request({ ...values, ...(id === undefined ? {} : { requestId: id }) })).status,
    ).toBe(400)
    expect(calls).toHaveLength(0)
  })
})
