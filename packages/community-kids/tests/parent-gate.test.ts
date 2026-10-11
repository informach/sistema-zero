import { beforeEach, describe, expect, mock, test } from 'bun:test'

const getSession = mock()
let legacyCookie: string | null = null
mock.module('server-only', () => ({}))
mock.module('@/server/session', () => ({ getSession }))
mock.module('next/headers', () => ({
  cookies: async () => ({
    get: () => (legacyCookie ? { value: legacyCookie } : undefined),
    set: () => {
      legacyCookie = null
    },
  }),
}))
const { requireParentGate, requireParentGateAccountOnly, isParentVerifiedFor } = await import(
  '../src/server/parent-gate'
)
const parent = {
  id: 'account-1',
  kids: { kind: 'parent', sessionId: 'parent-session', authenticatedAt: 1 },
}
const child = {
  id: 'profile-1',
  kids: { kind: 'student', sessionId: 'student-session' },
  activeProfile: { accountId: 'account-1' },
}
beforeEach(() => {
  getSession.mockReset()
  legacyCookie = null
})
describe('área dos pais separada da sessão infantil', () => {
  test('ausência de sessão e cookie legado não liberam a gestão', async () => {
    const handler = mock(async () => new Response('ok'))
    legacyCookie = 'qualquer-cookie-do-portao-antigo'
    for (const session of [null, { id: 'account-1' }, child]) {
      getSession.mockResolvedValue(session)
      expect(
        (
          await requireParentGateAccountOnly(handler)(
            new Request('https://kids.test/api/payments/my'),
            {},
          )
        ).status,
      ).toBe(403)
    }
    expect(handler).not.toHaveBeenCalled()
  })
  test('login adulto por senha ou OTP abre a gestão sem outro portão de senha', async () => {
    getSession.mockResolvedValue(parent)
    const handler = mock(async () => new Response('ok'))
    expect(
      (
        await requireParentGateAccountOnly(handler)(
          new Request('https://kids.test/api/payments/my'),
          {},
        )
      ).status,
    ).toBe(200)
    expect(await isParentVerifiedFor(parent.id)).toBe(true)
    expect(await isParentVerifiedFor('outra-conta')).toBe(false)
  })
  test('edição do próprio perfil aceita criança, mas sessão antiga não passa', async () => {
    const handler = mock(async () => new Response('ok'))
    getSession.mockResolvedValue(child)
    expect(
      (
        await requireParentGate(handler)(
          new Request('https://kids.test/api/profiles/profile-1'),
          {},
        )
      ).status,
    ).toBe(200)
    getSession.mockResolvedValue({ id: 'account-1' })
    expect(
      (
        await requireParentGate(handler)(
          new Request('https://kids.test/api/profiles/profile-1'),
          {},
        )
      ).status,
    ).toBe(401)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
