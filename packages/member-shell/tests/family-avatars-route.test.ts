import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createShellRoutes } = await import('../src/routes')

const SESSION = { getSession: async () => ({ id: 'conta-1' }) }

const ANA = '11111111-1111-4111-8111-111111111111'
const BIA = '22222222-2222-4222-8222-222222222222'

function profile(id: string, name: string) {
  return {
    id,
    name,
    avatarUrl: null,
    whatsapp: null,
    birthDate: null,
    publicProfileEnabled: false,
    sortOrder: 0,
  }
}

describe('fotos do avatar dos filhos (shell.routes.familyAvatars)', () => {
  test('pede os avatares só dos filhos da conta e devolve a foto de cada um', async () => {
    const asked: string[][] = []
    const routes = createShellRoutes({
      session: SESSION,
      profiles: {
        list: async () => ({
          status: 200,
          body: { profiles: [profile(ANA, 'Ana'), profile(BIA, 'Bia')] },
        }),
      },
      members: {
        listAvatarsByProfileIds: async (ids: string[]) => {
          asked.push(ids)
          return {
            status: 200,
            body: { avatars: { [ANA]: { photoUrl: 'https://cdn.test/ana.png', level: null } } },
          }
        },
      },
    } as never)
    const res = await routes.familyAvatars.GET()
    expect(res.status).toBe(200)
    expect(asked).toEqual([[ANA, BIA]])
    // Quem ainda não tem foto volta como null: o menu mostra a inicial.
    expect(await res.json()).toEqual({
      avatars: { [ANA]: 'https://cdn.test/ana.png', [BIA]: null },
    })
  })

  test('sem filhos não chama o members', async () => {
    let calls = 0
    const routes = createShellRoutes({
      session: SESSION,
      profiles: { list: async () => ({ status: 200, body: { profiles: [] } }) },
      members: {
        listAvatarsByProfileIds: async () => {
          calls++
          return { status: 200, body: { avatars: {} } }
        },
      },
    } as never)
    const res = await routes.familyAvatars.GET()
    expect(await res.json()).toEqual({ avatars: {} })
    expect(calls).toBe(0)
  })

  test('falha do members passa adiante com o status dele', async () => {
    const routes = createShellRoutes({
      session: SESSION,
      profiles: {
        list: async () => ({ status: 200, body: { profiles: [profile(ANA, 'Ana')] } }),
      },
      members: { listAvatarsByProfileIds: async () => ({ status: 503, body: null }) },
    } as never)
    const res = await routes.familyAvatars.GET()
    expect(res.status).toBe(503)
  })
})
