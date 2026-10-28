import { afterEach, describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createArquipelagoRoutes } = await import('../src/routes/arquipelago')

type Chamada = { caminho: string; metodo?: string; corpo?: unknown; query?: unknown }
type Resposta = { status: number; body: unknown; retryAfter?: string }

const PERFIL = '11111111-1111-4111-8111-111111111111'
const IRMAO = '33333333-3333-4333-8333-333333333333'

function montar(
  resposta: Resposta,
  perfis: Resposta = { status: 200, body: { profiles: [{ id: PERFIL }, { id: IRMAO }] } },
) {
  const chamadas: Chamada[] = []
  const routes = createArquipelagoRoutes({
    gateway: {
      gatewayFetch: async (
        caminho: string,
        opts: { method?: string; body?: unknown; query?: unknown },
      ) => {
        chamadas.push({
          caminho,
          metodo: opts.method,
          corpo: opts.body,
          ...(opts.query ? { query: opts.query } : {}),
        })
        return resposta
      },
    } as never,
    profiles: { list: async () => perfis } as never,
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
  test('recupera os eventos antigos pela rota própria do gateway', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { usadoHojeSegundos: 10 } })
    const corpo = { eventoId: 'id', dia: '2026-10-27', segundos: 10 }
    const resposta = await routes.arquipelagoRecuperarTempo.POST(pedido(JSON.stringify(corpo)))
    expect(resposta.status).toBe(200)
    expect(chamadas).toEqual([{ caminho: '/arquipelago/tempo/recuperar', metodo: 'POST', corpo }])
  })
  test('a sessão de tempo é repassada ao gateway com corpo limitado', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { situacao: 'ativa' } })
    const corpo = { sessaoId: 'id', sequencia: 0, acao: 'iniciar' }
    const resposta = await routes.arquipelagoSessaoTempo.POST(pedido(JSON.stringify(corpo)))
    expect(resposta.status).toBe(200)
    expect(chamadas).toEqual([{ caminho: '/arquipelago/tempo/sessao', metodo: 'POST', corpo }])
    expect((await routes.arquipelagoSessaoTempo.POST(pedido('{invalido'))).status).toBe(400)
    expect(chamadas).toHaveLength(1)
  })
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

  test('a leitura do limite leva os perfis da conta para o serviço decidir quem vê o jogo', async () => {
    const lido = { limiteDiarioMinutos: 30, algumaCriancaVe: true }
    const { routes, chamadas } = montar({ status: 200, body: lido })
    const r = await routes.arquipelagoLimiteDaFamilia.GET()
    expect(await r.json()).toEqual(lido)
    expect(chamadas).toEqual([
      {
        caminho: '/arquipelago/familia/limite',
        metodo: 'GET',
        corpo: undefined,
        query: { perfis: `${PERFIL},${IRMAO}` },
      },
    ])
  })

  test('conta sem perfis vai sem nenhum; sem a lista de perfis, nada segue', async () => {
    const vazia = montar({ status: 200, body: {} }, { status: 200, body: { profiles: [] } })
    await vazia.routes.arquipelagoLimiteDaFamilia.GET()
    expect(vazia.chamadas[0]?.query).toEqual({ perfis: '' })
    const recusada = montar(
      { status: 200, body: {} },
      { status: 403, body: { error: { code: 'FORBIDDEN' } } },
    )
    const r = await recusada.routes.arquipelagoLimiteDaFamilia.GET()
    expect(r.status).toBe(403)
    expect(recusada.chamadas).toEqual([])
    for (const corpo of [null, {}, { profiles: 'x' }]) {
      const estranha = montar({ status: 200, body: {} }, { status: 200, body: corpo })
      expect((await estranha.routes.arquipelagoLimiteDaFamilia.GET()).status).toBe(502)
      expect(estranha.chamadas).toEqual([])
    }
  })

  test('a semana leva os mesmos perfis e volta com o nome de cada criança, da grade do Auth', async () => {
    const semana = {
      algumaCriancaVe: true,
      inicio: '2026-10-22',
      fim: '2026-10-28',
      limiteDiarioMinutos: 30,
      criancas: [
        {
          perfilId: PERFIL,
          desafios: { aprovados: 2, deIlhasAnteriores: null },
          objetos: { pinta: 1, molda: 0 },
          tempoLivre: { segundos: 600, dias: 1 },
        },
      ],
      aindaSemJogo: [IRMAO],
    }
    const perfis = {
      status: 200,
      body: {
        profiles: [
          { id: PERFIL, name: ' Lia ' },
          { id: IRMAO, name: 'Tom' },
        ],
      },
    }
    const { routes, chamadas } = montar({ status: 200, body: semana }, perfis)
    const r = await routes.arquipelagoSemanaDaFamilia.GET()
    expect(await r.json()).toEqual({
      ...semana,
      criancas: [{ ...semana.criancas[0], nome: 'Lia' }],
      aindaSemJogo: [{ perfilId: IRMAO, nome: 'Tom' }],
    })
    expect(chamadas).toEqual([
      {
        caminho: '/arquipelago/familia/semana',
        metodo: 'GET',
        corpo: undefined,
        query: { perfis: `${PERFIL},${IRMAO}` },
      },
    ])
  })

  test('semana fora do contrato vira 502; erro do serviço passa como veio', async () => {
    const estranha = montar({ status: 200, body: { algumaCriancaVe: true } })
    expect((await estranha.routes.arquipelagoSemanaDaFamilia.GET()).status).toBe(502)
    const fechada = montar({ status: 403, body: { error: { code: 'FORBIDDEN' } } })
    expect((await fechada.routes.arquipelagoSemanaDaFamilia.GET()).status).toBe(403)
    const semPerfis = montar(
      { status: 200, body: {} },
      { status: 503, body: { error: { code: 'X' } } },
    )
    expect((await semPerfis.routes.arquipelagoSemanaDaFamilia.GET()).status).toBe(503)
    expect(semPerfis.chamadas).toEqual([])
  })

  test('as permissões vão e voltam pelo serviço, com corpo pequeno', async () => {
    const escolha = { visitasDeIrmaos: true, visitasDeOutrasCriancas: false, fotosNoClube: true }
    const { routes, chamadas } = montar({ status: 200, body: escolha })
    expect(await (await routes.arquipelagoPermissoesDaFamilia.GET()).json()).toEqual(escolha)
    await routes.arquipelagoPermissoesDaFamilia.PUT(pedido(JSON.stringify(escolha)))
    expect(chamadas).toEqual([
      { caminho: '/arquipelago/familia/permissoes', metodo: 'GET', corpo: undefined },
      { caminho: '/arquipelago/familia/permissoes', metodo: 'PUT', corpo: escolha },
    ])
    expect((await routes.arquipelagoPermissoesDaFamilia.PUT(pedido('{x'))).status).toBe(400)
  })

  test('o perfil que ainda entra na jornada não conta (a criança não abre esse perfil)', async () => {
    const perfis = {
      status: 200,
      body: {
        profiles: [
          { id: PERFIL, admissionState: 'pending' },
          { id: IRMAO, admissionState: 'ready' },
        ],
      },
    }
    const { routes, chamadas } = montar({ status: 200, body: {} }, perfis)
    await routes.arquipelagoLimiteDaFamilia.GET()
    expect(chamadas[0]?.query).toEqual({ perfis: IRMAO })
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
      profiles: { list: async () => ({ status: 200, body: { profiles: [] } }) } as never,
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
