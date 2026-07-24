import { beforeEach, describe, expect, mock, test } from 'bun:test'

const getSession = mock()
let parentToken: string | null = null

mock.module('server-only', () => ({}))
mock.module('@/server/session', () => ({ getSession }))
mock.module('next/headers', () => ({
  cookies: async () => ({
    get: () => (parentToken ? { value: parentToken } : undefined),
    set: (_name: string, value: string) => {
      parentToken = value || null
    },
  }),
}))

const { requireParentGate, requireParentGateAccountOnly, setParentVerified } = await import(
  '../src/server/parent-gate'
)

const accountSession = { id: 'account-1', role: 'student' }
const profileSession = {
  ...accountSession,
  activeProfile: { accountId: 'account-1', name: 'Ana' },
}

beforeEach(() => {
  getSession.mockReset()
  parentToken = null
})

describe('portão dos pais', () => {
  test('exige autenticação e não chama a mutação quando não há sessão', async () => {
    const handler = mock(async () => new Response('ok'))
    const protectedHandler = requireParentGate(handler)
    getSession.mockResolvedValue(null)

    const response = await protectedHandler(new Request('https://kids.test/api/profiles'), {})

    expect(response.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  test('permite o autoatendimento do próprio perfil, mas bloqueia a conta sem prova recente', async () => {
    const handler = mock(async () => new Response('ok'))
    const protectedHandler = requireParentGate(handler)

    getSession.mockResolvedValue(profileSession)
    expect((await protectedHandler(new Request('https://kids.test/api/profiles'), {})).status).toBe(
      200,
    )

    getSession.mockResolvedValue(accountSession)
    expect((await protectedHandler(new Request('https://kids.test/api/profiles'), {})).status).toBe(
      403,
    )
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('libera a sessão da conta somente depois do cookie assinado e válido', async () => {
    const handler = mock(async () => new Response('ok'))
    const protectedHandler = requireParentGate(handler)
    getSession.mockResolvedValue(accountSession)
    await setParentVerified(accountSession.id)

    const response = await protectedHandler(new Request('https://kids.test/api/profiles'), {})

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('o gate estrito protege compras e relatórios contra sessão de perfil', async () => {
    const handler = mock(async () => new Response('ok'))
    const protectedHandler = requireParentGateAccountOnly(handler)
    getSession.mockResolvedValue(profileSession)

    const profileResponse = await protectedHandler(
      new Request('https://kids.test/api/payments/my'),
      {},
    )

    expect(profileResponse.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()

    getSession.mockResolvedValue(accountSession)
    await setParentVerified(accountSession.id)
    const accountResponse = await protectedHandler(
      new Request('https://kids.test/api/payments/my'),
      {},
    )

    expect(accountResponse.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
