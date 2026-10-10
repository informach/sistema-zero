import { beforeEach, describe, expect, mock, test } from 'bun:test'

/**
 * A área dos pais nasce sabendo se a família já preparou algum acesso (`listFamilyGrantsReadonly`).
 * O que importa aqui é o "não sei": uma consulta que falhou NUNCA pode virar "sem acesso", senão o
 * guia volta a dizer "Vamos preparar o acesso?" a quem já preparou, e o aviso de vencimento some.
 */

const calls: Array<{ path: string; body: unknown }> = []
let deviceToken: string | null = 'token-do-aparelho'
let reply: (profileId: string) => Promise<{ status: number; body: unknown }>
const shellMock = {
  shell: {
    study: { getDeviceToken: async () => deviceToken },
    gateway: {
      gatewayFetchReadonly: async (path: string, init: { body: { profileId: string } }) => {
        calls.push({ path, body: init.body })
        return reply(init.body.profileId)
      },
    },
  },
}
mock.module('server-only', () => ({}))
mock.module('@/server/shell', () => shellMock)
mock.module('../src/server/shell', () => shellMock)
const { listFamilyGrantsReadonly } = await import('../src/server/family-access')

const ANDRE = '11111111-1111-4111-8111-111111111111'
const DEBORA = '22222222-2222-4222-8222-222222222222'
const grant = (profileId: string) => ({
  id: '33333333-3333-4333-8333-333333333333',
  profileId,
  label: 'Computador de casa',
  expiresAt: '2027-01-08T12:00:00.000Z',
  revokedAt: null,
  lastUsedAt: null,
})

beforeEach(() => {
  calls.length = 0
  deviceToken = 'token-do-aparelho'
})

describe('as autorizações da família, lidas no servidor', () => {
  test('cada criança é consultada com o aparelho atual, e sem criança não há consulta', async () => {
    reply = async (profileId) => ({ status: 200, body: { grants: [grant(profileId)] } })
    expect(await listFamilyGrantsReadonly([])).toEqual({})
    expect(calls).toEqual([])
    const result = await listFamilyGrantsReadonly([ANDRE, DEBORA])
    expect(result[ANDRE]?.map((g) => g.profileId)).toEqual([ANDRE])
    expect(result[DEBORA]?.map((g) => g.profileId)).toEqual([DEBORA])
    expect(calls).toEqual([
      {
        path: '/auth/kids/grants/list',
        body: { profileId: ANDRE, deviceToken: 'token-do-aparelho' },
      },
      {
        path: '/auth/kids/grants/list',
        body: { profileId: DEBORA, deviceToken: 'token-do-aparelho' },
      },
    ])
  })

  test('sem cookie do aparelho a consulta segue, sem token', async () => {
    deviceToken = null
    reply = async () => ({ status: 200, body: { grants: [] } })
    expect(await listFamilyGrantsReadonly([ANDRE])).toEqual({ [ANDRE]: [] })
    expect(calls[0]?.body).toEqual({ profileId: ANDRE, deviceToken: undefined })
  })

  test('falha, erro de status ou corpo estranho viram "não sei" (null), nunca "sem acesso"', async () => {
    reply = async (profileId) => {
      if (profileId === ANDRE) throw new Error('gateway fora')
      return { status: 503, body: { grants: [] } }
    }
    expect(await listFamilyGrantsReadonly([ANDRE, DEBORA])).toEqual({
      [ANDRE]: null,
      [DEBORA]: null,
    })
    reply = async () => ({ status: 200, body: { grants: [{ id: 'não é uuid' }] } })
    expect(await listFamilyGrantsReadonly([ANDRE])).toEqual({ [ANDRE]: null })
  })
})
