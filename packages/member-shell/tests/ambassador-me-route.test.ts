import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createShellRoutes } = await import('../src/routes')

const USER = {
  id: 'user-1',
  email: 'pessoa@example.com',
  firstName: 'Pessoa',
  lastName: 'Teste',
  role: 'customer',
  status: 'active',
}

const enrolled = {
  enrolled: true,
  ambassador: {
    code: 'ana-1',
    status: 'active',
    pageUrl: 'https://funil.test/embaixador/tok',
    shareUrl: 'https://funil.test/bolsa/ana-1',
    shareUrls: {
      kids: 'https://funil.test/bolsa/ana-1',
      adult: 'https://funil.test/bolsa/ana-1-adulto',
    },
    pixKeySet: false,
  },
  stats: { redemptionsCompleted: 2, invitesSent: 0 },
  bonus: { amountCents: 3000, eligibleCount: 0, paidCount: 0 },
}

describe('rota do embaixador (shell.routes.ambassadorMe)', () => {
  test('GET repassa os dois links (shareUrls) e o shareUrl antigo', async () => {
    const routes = createShellRoutes({
      session: { getSession: async () => USER },
      members: { getAmbassadorEnrollment: async () => ({ status: 200, body: enrolled }) },
    } as never)
    const res = await routes.ambassadorMe.GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ambassador.shareUrls).toEqual(enrolled.ambassador.shareUrls)
    expect(body.ambassador.shareUrl).toBe(enrolled.ambassador.shareUrl)
  })

  test('POST numa sessão de suporte somente leitura não chega ao referrals', async () => {
    let calls = 0
    const routes = createShellRoutes({
      session: {
        getSession: async () => ({ ...USER, act: { sub: 'admin-1', mode: 'readonly' as const } }),
      },
      members: {
        enrollAmbassador: async () => {
          calls++
          return { status: 200, body: enrolled }
        },
      },
    } as never)
    const res = await routes.ambassadorMe.POST()
    expect(res.status).toBe(403)
    expect(calls).toBe(0)
  })

  test('POST da própria conta repassa a resposta do cadastro', async () => {
    const routes = createShellRoutes({
      session: { getSession: async () => USER },
      members: {
        enrollAmbassador: async () => ({ status: 200, body: { ...enrolled, created: true } }),
      },
    } as never)
    const res = await routes.ambassadorMe.POST()
    expect(res.status).toBe(200)
    expect((await res.json()).ambassador.shareUrls.adult).toBe(
      'https://funil.test/bolsa/ana-1-adulto',
    )
  })
})
