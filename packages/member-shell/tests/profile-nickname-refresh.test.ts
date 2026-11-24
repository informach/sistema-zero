import { describe, expect, mock, test } from 'bun:test'
import type { SessionUser } from '../src/lib/types'

mock.module('server-only', () => ({}))
const { createShellRoutes } = await import('../src/routes')
const { createProfilesClient } = await import('../src/server/clients')

// A criança troca o PRÓPRIO apelido (24/11/2026): o BFF renova a sessão para o menu,
// que lê o apelido da claim `pfl`, mostrar o novo sem esperar o access token vencer.
const CHILD = '22222222-2222-4222-8222-222222222222'
const SIBLING = '33333333-3333-4333-8333-333333333333'
const base: SessionUser = {
  id: CHILD,
  email: '',
  firstName: '',
  lastName: '',
  role: 'customer',
  status: 'active',
}
const child: SessionUser = { ...base, activeProfile: { accountId: 'parent', name: 'Fada Azul' } }
const parent: SessionUser = { ...base, id: 'parent' }

function setup(user: SessionUser, upstreamStatus = 200) {
  let refreshes = 0
  const profiles = createProfilesClient({
    gatewayFetch: async () => ({ status: upstreamStatus, body: { profile: { id: CHILD } } }),
  } as never)
  const routes = createShellRoutes({
    session: { getSession: async () => user },
    gateway: {
      refreshSession: async () => {
        refreshes++
        return { state: 'renewed', accessToken: 'novo' }
      },
    },
    profiles,
  } as never)
  const patch = (id: string, body: unknown) =>
    routes.profileUpdate.PATCH(
      new Request(`https://kids.test/api/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    )
  return { patch, refreshes: () => refreshes }
}

describe('troca do apelido renova a sessão de perfil', () => {
  test('a criança muda o próprio apelido → renova uma vez', async () => {
    const { patch, refreshes } = setup(child)
    expect((await patch(CHILD, { publicNickname: 'Raio Verde' })).status).toBe(200)
    expect(refreshes()).toBe(1)
  })
  test('só o telefone não renova', async () => {
    const { patch, refreshes } = setup(child)
    expect((await patch(CHILD, { whatsapp: '+5511999990000' })).status).toBe(200)
    expect(refreshes()).toBe(0)
  })
  test('recusa do Auth não renova', async () => {
    const { patch, refreshes } = setup(child, 403)
    expect((await patch(CHILD, { publicNickname: 'Raio Verde' })).status).toBe(403)
    expect(refreshes()).toBe(0)
  })
  test('sessão da conta (pai editando) e perfil de outro id não renovam', async () => {
    const pai = setup(parent)
    expect((await pai.patch(CHILD, { publicNickname: 'Raio Verde' })).status).toBe(200)
    expect(pai.refreshes()).toBe(0)
    const outro = setup(child)
    await outro.patch(SIBLING, { publicNickname: 'Raio Verde' })
    expect(outro.refreshes()).toBe(0)
  })
})
