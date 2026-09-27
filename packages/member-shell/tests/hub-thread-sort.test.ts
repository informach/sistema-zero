import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createHubRoutes } = await import('../src/routes/hub')

const CHANNEL = '9b2f1d1e-7a55-4c2e-9d0a-1f2e3d4c5b6a'

/** Handler real com um hub falso que só anota os parâmetros que recebeu. */
function montar() {
  const recebidos: Array<{ sort?: string; cursor?: string }> = []
  const routes = createHubRoutes({
    audience: 'adult',
    session: { getSession: async () => ({ id: 'aluno-1', role: 'customer', status: 'active' }) },
    hub: {
      listThreads: async (_id: string, params: { sort?: string; cursor?: string }) => {
        recebidos.push(params)
        return { status: 200, body: { items: [], nextCursor: null, hasMore: false } }
      },
    },
  } as never)
  const listar = (qs: string) =>
    routes.hubChannelThreads.GET(
      new Request(`https://kids.test/api/hub/channels/${CHANNEL}/threads${qs}`),
      { params: Promise.resolve({ id: CHANNEL }) },
    )
  return { recebidos, listar }
}

describe('filtros do Mural no BFF (`?sort=`)', () => {
  test('repassa ao hub as duas ordens alternativas, com o cursor junto', async () => {
    const { recebidos, listar } = montar()
    expect((await listar('?sort=plays')).status).toBe(200)
    expect((await listar('?sort=recent&cursor=abc')).status).toBe(200)
    expect(recebidos.map((p) => p.sort)).toEqual(['plays', 'recent'])
    expect(recebidos[1]?.cursor).toBe('abc')
  })

  test('sem `sort`, ou com lixo, segue a ordem padrão em vez de derrubar a página', async () => {
    const { recebidos, listar } = montar()
    await listar('')
    await listar('?sort=aleatorio')
    await listar('?sort=activity')
    expect(recebidos.map((p) => p.sort)).toEqual([undefined, undefined, undefined])
  })
})
