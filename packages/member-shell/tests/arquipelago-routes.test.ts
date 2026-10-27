import { afterEach, describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createArquipelagoRoutes } = await import('../src/routes/arquipelago')

type Chamada = { caminho: string; metodo?: string; corpo?: unknown }

function montar(resposta: { status: number; body: unknown; retryAfter?: string }) {
  const chamadas: Chamada[] = []
  const routes = createArquipelagoRoutes({
    gateway: {
      gatewayFetch: async (caminho: string, opts: { method?: string; body?: unknown }) => {
        chamadas.push({ caminho, metodo: opts.method, corpo: opts.body })
        return resposta
      },
    } as never,
  })
  return { routes, chamadas }
}

const pedido = (corpo: string) =>
  new Request('http://local/api/arquipelago/salvamento', { method: 'PUT', body: corpo })

const fetchOriginal = globalThis.fetch
afterEach(() => {
  globalThis.fetch = fetchOriginal
})

describe('repasse do Arquipélago', () => {
  test('acesso e salvamento vão ao serviço do jogo pelo gateway, com a resposta inteira', async () => {
    const { routes, chamadas } = montar({ status: 409, body: { error: { code: 'X' }, atual: {} } })
    const r = await routes.arquipelagoSalvamento.PUT(pedido('{"revisaoBase":1}'))
    expect(r.status).toBe(409)
    expect(await r.json()).toEqual({ error: { code: 'X' }, atual: {} })
    await routes.arquipelagoAcesso.GET()
    await routes.arquipelagoCartas.GET()
    expect(chamadas).toEqual([
      { caminho: '/arquipelago/salvamento', metodo: 'PUT', corpo: { revisaoBase: 1 } },
      { caminho: '/arquipelago/acesso', metodo: 'GET', corpo: undefined },
      { caminho: '/arquipelago/cartas', metodo: 'GET', corpo: undefined },
    ])
  })

  test('corpo que não é JSON ou passa de 96 KB não sai do BFF', async () => {
    const { routes, chamadas } = montar({ status: 200, body: {} })
    expect((await routes.arquipelagoTempo.POST(pedido('{nao'))).status).toBe(400)
    const grande = JSON.stringify({ x: 'a'.repeat(100 * 1024) })
    expect((await routes.arquipelagoSalvamento.PUT(pedido(grande))).status).toBe(400)
    expect(chamadas).toEqual([])
  })

  test('serviço sem corpo vira 502, sem fingir sucesso', async () => {
    const { routes } = montar({ status: 200, body: null })
    const r = await routes.arquipelagoAcesso.GET()
    expect(r.status).toBe(502)
  })

  test('limite da família vai ao mesmo serviço', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { limiteDiarioMinutos: 45 } })
    const r = await routes.arquipelagoLimiteDaFamilia.PUT(pedido('{"limiteDiarioMinutos":45}'))
    expect(await r.json()).toEqual({ limiteDiarioMinutos: 45 })
    expect(chamadas[0]?.caminho).toBe('/arquipelago/familia/limite')
  })

  test('cliente: só nomes do build, com os cabeçalhos de cache do serviço', async () => {
    const pedidos: string[] = []
    globalThis.fetch = (async (url: URL) => {
      pedidos.push(url.pathname)
      return new Response('export const ok = 1', {
        headers: {
          'content-type': 'text/javascript; charset=utf-8',
          'cache-control': 'public, max-age=31536000, immutable',
          'set-cookie': 'nao=passa',
        },
      })
    }) as unknown as typeof fetch
    const { routes } = montar({ status: 200, body: {} })
    const ctx = (arquivo: string) => ({ params: Promise.resolve({ arquivo }) })
    const ok = await routes.arquipelagoCliente.GET(
      new Request('http://local'),
      ctx('entrada-abc.js'),
    )
    expect(await ok.text()).toBe('export const ok = 1')
    expect(ok.headers.get('cache-control')).toContain('immutable')
    expect(ok.headers.get('set-cookie')).toBeNull()
    for (const ruim of ['..%2Fsegredo.js', 'a/b.js', 'pagina.html', 'x.js.exe']) {
      expect(
        (await routes.arquipelagoCliente.GET(new Request('http://local'), ctx(ruim))).status,
      ).toBe(404)
    }
    expect(pedidos).toEqual(['/arquipelago/cliente/entrada-abc.js'])
  })

  test('desafios: ilha e id conferidos no BFF; conferir com o prazo longo', async () => {
    const chamadas: { caminho: string; opts: Record<string, unknown> }[] = []
    const routes = createArquipelagoRoutes({
      gateway: {
        gatewayFetch: async (caminho: string, opts: Record<string, unknown>) => {
          chamadas.push({ caminho, opts })
          return { status: 200, body: { ok: true } }
        },
      } as never,
    })
    const id = '22222222-2222-4222-8222-222222222222'
    const ctx = (valor: string) => ({ params: Promise.resolve({ id: valor }) })
    await routes.arquipelagoDesafios.GET(new Request('http://local/api/arquipelago/desafios'))
    await routes.arquipelagoDesafios.GET(
      new Request('http://local/api/arquipelago/desafios?ilha=bosque'),
    )
    expect(
      (
        await routes.arquipelagoDesafios.GET(
          new Request('http://local/api/arquipelago/desafios?ilha=../x'),
        )
      ).status,
    ).toBe(400)
    await routes.arquipelagoDesafio.GET(new Request('http://local'), ctx(id))
    expect(
      (await routes.arquipelagoDesafio.GET(new Request('http://local'), ctx('x'))).status,
    ).toBe(400)
    await routes.arquipelagoDesafioVerificar.POST(
      new Request('http://local', { method: 'POST', body: '{"revisao":1,"projeto":{}}' }),
      ctx(id),
    )
    await routes.arquipelagoDesafioRecompensaVista.POST(new Request('http://local'), ctx(id))
    expect(chamadas.map((c) => c.caminho)).toEqual([
      '/arquipelago/desafios',
      '/arquipelago/desafios',
      `/arquipelago/desafios/${id}`,
      `/arquipelago/desafios/${id}/verificar`,
      `/arquipelago/desafios/${id}/recompensa-vista`,
    ])
    expect(chamadas[1]?.opts.query).toEqual({ ilha: 'bosque' })
    expect(chamadas[3]?.opts).toMatchObject({
      method: 'POST',
      body: { revisao: 1, projeto: {} },
      timeoutMs: 165_000,
    })
  })

  test('conferir: corpo acima de 4 MB não sai do BFF', async () => {
    const { routes, chamadas } = montar({ status: 200, body: {} })
    const grande = JSON.stringify({ revisao: 1, projeto: { x: 'a'.repeat(4 * 1024 * 1024) } })
    const r = await routes.arquipelagoDesafioVerificar.POST(
      new Request('http://local', { method: 'POST', body: grande }),
      { params: Promise.resolve({ id: '22222222-2222-4222-8222-222222222222' }) },
    )
    expect(r.status).toBe(400)
    expect(chamadas).toEqual([])
  })
})
