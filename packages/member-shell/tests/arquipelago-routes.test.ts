import { afterEach, describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createArquipelagoRoutes } = await import('../src/routes/arquipelago')

type Chamada = { caminho: string; metodo?: string; corpo?: unknown; query?: unknown }
type Resposta = { status: number; body: unknown; retryAfter?: string }

const PERFIL = '11111111-1111-4111-8111-111111111111'
const IRMAO = '33333333-3333-4333-8333-333333333333'

test('convites adultos repassam somente os métodos previstos e preservam privacidade no erro local', async () => {
  const { routes, chamadas } = montar({ status: 200, body: { versao: 1, ativo: false } })
  const post = (corpo: unknown) =>
    new Request('http://local', { method: 'POST', body: JSON.stringify(corpo) })
  const respostas = [
    await routes.arquipelagoConviteAdulto.GET(),
    await routes.arquipelagoConviteAdulto.POST(post({})),
    await routes.arquipelagoConviteAdulto.DELETE(),
    await routes.arquipelagoVisitaAdulta.POST(post({ codigo: 'a'.repeat(32) })),
    await routes.arquipelagoConferirVisitaAdulta.POST(post({ codigo: 'a'.repeat(32) })),
  ]
  for (const r of respostas) expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas.map((c) => c.metodo)).toEqual(['GET', 'POST', 'DELETE', 'POST', 'POST'])
  expect(chamadas.map((c) => c.caminho)).toEqual([
    '/arquipelago/visitas-adultas/convite',
    '/arquipelago/visitas-adultas/convite',
    '/arquipelago/visitas-adultas/convite',
    '/arquipelago/visitas-adultas/abrir',
    '/arquipelago/visitas-adultas/conferir',
  ])
  const invalida = await routes.arquipelagoVisitaAdulta.POST(post({ codigo: 'a'.repeat(2048) }))
  expect(invalida.status).toBe(400)
  expect(invalida.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas).toHaveLength(5)
})

function montar(
  resposta: Resposta,
  perfis: Resposta = { status: 200, body: { profiles: [{ id: PERFIL }, { id: IRMAO }] } },
  irmaos: Resposta = { status: 200, body: { siblings: [{ id: IRMAO, name: 'Irmão' }] } },
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
    profiles: { list: async () => perfis, siblings: async () => irmaos } as never,
  })
  return { routes, chamadas }
}

const pedido = (corpo: string) =>
  new Request('http://local/api/arquipelago/salvamento', { method: 'PUT', body: corpo })

const fetchOriginal = globalThis.fetch

test('fantasma não usa um perfil removido da lista atual do Auth nem avança sem a leitura', async () => {
  for (const [lista, status] of [
    [{ status: 200, body: { siblings: [] } }, 404],
    [{ status: 502, body: null }, 502],
  ] as const) {
    const { routes, chamadas } = montar({ status: 200, body: {} }, undefined, lista)
    const r = await routes.arquipelagoFantasmaDoIrmao.GET(new Request('http://local'), {
      params: Promise.resolve({ id: IRMAO, percurso: 'bosque-copas' }),
    })
    expect(r.status).toBe(status)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(chamadas).toHaveLength(0)
  }
})
test('cores conquistadas só repassam GET privado sem identidade no corpo ou na consulta', async () => {
  const corpo = { versao: 1, ilhas: [{ id: 'bosque', quadros: [1] }] }
  const { routes, chamadas } = montar({ status: 200, body: corpo })
  const resposta = await routes.arquipelagoCoresConquistadas.GET()
  expect(resposta.status).toBe(200)
  expect(await resposta.json()).toEqual(corpo)
  expect(resposta.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas).toEqual([
    { caminho: '/arquipelago/desafios/cores', metodo: 'GET', corpo: undefined },
  ])
  expect(Object.keys(routes.arquipelagoCoresConquistadas)).toEqual(['GET'])
})

test('trajetos validam caminho, limitam corpo e não usam cache', async () => {
  const { routes, chamadas } = montar({ status: 200, body: { versao: 1, situacao: 'ausente' } })
  const r = await routes.arquipelagoFantasma.GET(new Request('http://local'), {
    params: Promise.resolve({ percurso: 'bosque-copas' }),
  })
  expect(r.status).toBe(200)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas[0]?.caminho).toBe('/arquipelago/fantasmas/bosque-copas')
  expect(
    (
      await routes.arquipelagoFantasma.GET(new Request('http://local'), {
        params: Promise.resolve({ percurso: 'outro' }),
      })
    ).status,
  ).toBe(400)
  expect(
    (
      await routes.arquipelagoFantasmaDoIrmao.GET(new Request('http://local'), {
        params: Promise.resolve({ id: IRMAO, percurso: 'vila-telhados' }),
      })
    ).status,
  ).toBe(200)
  expect(chamadas.at(-1)?.caminho).toBe(`/arquipelago/irmaos/${IRMAO}/fantasmas/vila-telhados`)
  const antes = chamadas.length
  expect(
    (
      await routes.arquipelagoFantasmaDoIrmao.GET(new Request('http://local'), {
        params: Promise.resolve({ id: 'outro', percurso: 'vila-telhados' }),
      })
    ).status,
  ).toBe(400)
  expect(
    (
      await routes.arquipelagoFantasmas.PUT(
        new Request('http://local', { method: 'PUT', body: 'x'.repeat(129 * 1024 + 1) }),
      )
    ).status,
  ).toBe(400)
  expect(chamadas).toHaveLength(antes)
})
test('pedidos repassam comando e pendências de forma privada, sem cache e com corpo limitado', async () => {
  const { routes, chamadas } = montar({ status: 200, body: { pagamento: 'pendente' } })
  const pendentes = await routes.arquipelagoPedidosPendentes.GET()
  expect(pendentes.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas.at(-1)?.caminho).toBe('/arquipelago/pedidos/pendentes')
  const corpo = {
    versao: 1,
    chave: PERFIL,
    revisaoBase: 1,
    morador: 'bento',
    dia: '2026-10-30',
    pedido: 'milho-2',
  }
  const r = await routes.arquipelagoPedidosEntregar.POST(
    new Request('http://local', { method: 'POST', body: JSON.stringify(corpo) }),
  )
  expect(r.status).toBe(200)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas.at(-1)).toMatchObject({
    caminho: '/arquipelago/pedidos/entregar',
    metodo: 'POST',
    corpo,
  })
  const n = chamadas.length
  expect(
    (
      await routes.arquipelagoPedidosEntregar.POST(
        new Request('http://local', {
          method: 'POST',
          body: JSON.stringify({ texto: 'a'.repeat(1025) }),
        }),
      )
    ).status,
  ).toBe(400)
  expect(chamadas).toHaveLength(n)
})

test('vendas da feira repassam comando e pendências sem cache e com corpo limitado', async () => {
  const { routes, chamadas } = montar({ status: 200, body: { pagamento: 'pendente' } })
  const pendentes = await routes.arquipelagoFeiraVendasPendentes.GET()
  expect(pendentes.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas.at(-1)?.caminho).toBe('/arquipelago/feira/vendas/pendentes')
  const corpo = {
    versao: 1,
    chave: PERFIL,
    revisaoBase: 1,
    dia: '2026-10-31',
    itens: { 'pao-de-queijo': 2 },
  }
  const r = await routes.arquipelagoFeiraVender.POST(
    new Request('http://local', { method: 'POST', body: JSON.stringify(corpo) }),
  )
  expect(r.status).toBe(200)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas.at(-1)).toMatchObject({
    caminho: '/arquipelago/feira/vender',
    metodo: 'POST',
    corpo,
  })
  const n = chamadas.length
  expect(
    (
      await routes.arquipelagoFeiraVender.POST(
        new Request('http://local', {
          method: 'POST',
          body: JSON.stringify({ texto: 'a'.repeat(1025) }),
        }),
      )
    ).status,
  ).toBe(400)
  expect(chamadas).toHaveLength(n)
})

test('as roupas conquistadas repassam sem corpo do navegador e sem cache (A21)', async () => {
  const { routes, chamadas } = montar({ status: 200, body: { versao: 1, novas: [] } })
  const r = await routes.arquipelagoRoupasSincronizar.POST()
  expect(r.status).toBe(200)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas.at(-1)).toMatchObject({
    caminho: '/arquipelago/roupas/sincronizar',
    metodo: 'POST',
    corpo: {},
  })
})

test('insumos repassam compra e pendência sem cache e limitam o corpo', async () => {
  const { routes, chamadas } = montar({ status: 423, body: { error: { code: 'COMPRA_PENDENTE' } } })
  const pendente = await routes.arquipelagoInsumosPendentes.GET()
  expect(pendente.status).toBe(423)
  expect(pendente.headers.get('cache-control')).toBe('private, no-store')
  const corpo = { versao: 1, chave: PERFIL, revisaoBase: 1, item: 'leite', quantidade: 3 }
  await routes.arquipelagoInsumosComprar.POST(
    new Request('http://local', {
      method: 'POST',
      body: JSON.stringify(corpo),
      headers: { 'content-type': 'application/json' },
    }),
  )
  expect(chamadas.at(-1)).toMatchObject({
    caminho: '/arquipelago/insumos/comprar',
    metodo: 'POST',
    corpo,
  })
  const n = chamadas.length
  expect(
    (
      await routes.arquipelagoInsumosComprar.POST(
        new Request('http://local', {
          method: 'POST',
          body: JSON.stringify({ texto: 'a'.repeat(1025) }),
        }),
      )
    ).status,
  ).toBe(400)
  expect(chamadas).toHaveLength(n)
})
test('Mural próprio usa Hub, valida o contrato e não compartilha cache', async () => {
  const corpo = { jogos: [{ playId: PERFIL, titulo: 'Meu jogo' }] }
  const { routes, chamadas } = montar({ status: 200, body: corpo })
  const r = await routes.arquipelagoJogosDoMural.GET()
  expect(r.status).toBe(200)
  expect(await r.json()).toEqual(corpo)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(chamadas).toEqual([
    { caminho: '/hub/my-playable-showcase', metodo: 'GET', corpo: undefined },
  ])
  for (const resposta of [
    { status: 200, body: { jogos: [{ playId: 'invalido' }] } },
    { status: 401, body: null },
  ]) {
    const falha = await montar(resposta).routes.arquipelagoJogosDoMural.GET()
    expect(falha.status).toBe(resposta.status === 200 ? 502 : 401)
    expect(falha.headers.get('cache-control')).toBe('private, no-store')
  }
})
describe('profissões no repasse', () => {
  test('repasse privado, sem mudar o corpo, e recusa corpo grande antes do gateway', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { pagamento: 'pendente' } })
    for (const [acao, handler] of [
      ['iniciar', routes.arquipelagoProfissaoIniciar.POST],
      ['concluir', routes.arquipelagoProfissaoConcluir.POST],
    ] as const) {
      const corpo = acao === 'iniciar' ? { posto: 'padaria' } : { sessao: PERFIL, respostas: [] }
      const resposta = await handler(
        new Request(`http://local/api/arquipelago/profissoes/${acao}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(corpo),
        }),
      )
      expect(resposta.headers.get('cache-control')).toBe('private, no-store')
      expect(chamadas.at(-1)).toMatchObject({
        caminho: `/arquipelago/profissoes/${acao}`,
        metodo: 'POST',
        corpo,
      })
      const n = chamadas.length
      expect(
        (
          await handler(
            new Request('http://local', {
              method: 'POST',
              body: JSON.stringify({ texto: 'a'.repeat(4097) }),
            }),
          )
        ).status,
      ).toBe(400)
      expect(chamadas).toHaveLength(n)
    }
  })
})
describe('minijogos aprovados no repasse', () => {
  test('jogador lista e abre só pelo id validado', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { minijogos: [] } })
    const lista = await routes.arquipelagoMinijogos.GET()
    expect(lista.headers.get('cache-control')).toBe('private, no-store')
    await routes.arquipelagoMinijogo.GET(new Request('http://local'), {
      params: Promise.resolve({ id: IRMAO }),
    })
    expect(chamadas.map((c) => c.caminho)).toEqual([
      '/arquipelago/minijogos',
      `/arquipelago/minijogos/${IRMAO}`,
    ])
    expect(
      (
        await routes.arquipelagoMinijogo.GET(new Request('http://local'), {
          params: Promise.resolve({ id: '../outra-pessoa' }),
        })
      ).status,
    ).toBe(400)
    expect(chamadas).toHaveLength(2)
  })
  test('pais só repassam perfis da grade da própria conta', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { minijogos: [] } })
    const ctx = (perfil: string) => ({ params: Promise.resolve({ perfil }) })
    expect(
      (
        await routes.arquipelagoMinijogosDaFamilia.GET(
          new Request('http://local'),
          ctx('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        )
      ).status,
    ).toBe(400)
    expect(chamadas).toHaveLength(0)
    await routes.arquipelagoMinijogosDaFamilia.GET(
      new Request(`http://local?id=${IRMAO}`),
      ctx(PERFIL),
    )
    expect(chamadas[0]?.caminho).toBe(`/arquipelago/familia/minijogos/${PERFIL}/${IRMAO}`)
  })
  test('lista agregada da família esconde falha sem inventar minijogos', async () => {
    const { routes } = montar({ status: 503, body: null })
    const r = await routes.arquipelagoTodosMinijogosDaFamilia.GET()
    expect(await r.json()).toEqual({ criancas: [] })
    expect(r.headers.get('cache-control')).toContain('no-store')
  })
})
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

  test('a galeria: ler e comprar vão ao serviço do jogo, a compra com corpo pequeno', async () => {
    const compra = { aparencia: 'forno-classico', chave: '11111111-1111-4111-8111-111111111111' }
    const { routes, chamadas } = montar({ status: 200, body: { possuidas: [] } })
    await routes.arquipelagoGaleria.GET()
    await routes.arquipelagoGaleriaCompras.POST(
      new Request('http://local/api/arquipelago/galeria/compras', {
        method: 'POST',
        body: JSON.stringify(compra),
      }),
    )
    expect(chamadas).toEqual([
      { caminho: '/arquipelago/galeria', metodo: 'GET', corpo: undefined },
      { caminho: '/arquipelago/galeria/compras', metodo: 'POST', corpo: compra },
    ])
    const grande = new Request('http://local/api/arquipelago/galeria/compras', {
      method: 'POST',
      body: JSON.stringify({ ...compra, sobra: 'x'.repeat(2000) }),
    })
    // Acima de 1 KB não sai do BFF (como o salvamento acima do teto: 400).
    expect((await routes.arquipelagoGaleriaCompras.POST(grande)).status).toBe(400)
    expect(chamadas).toHaveLength(2)
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

describe('recordes da família e visitas (fase3-12)', () => {
  const OUTRO = '44444444-4444-4444-8444-444444444444'
  const recorde = {
    estrelas: { chegada: true, tempo: false, vagalumes: true },
    melhorTempoMs: 61_000,
  }
  const doServico = {
    versao: 1,
    situacao: 'ok',
    irmaos: [
      { perfilId: IRMAO, percursos: { 'bosque-copas': recorde }, temCasa: true },
      { perfilId: OUTRO, percursos: {}, temCasa: false },
    ],
  }
  function comIrmaos(servico: Resposta, irmaos: Resposta) {
    let pedidosAoAuth = 0
    const routes = createArquipelagoRoutes({
      gateway: { gatewayFetch: async () => servico } as never,
      profiles: {
        list: async () => ({ status: 403, body: null }),
        siblings: async () => {
          pedidosAoAuth++
          return irmaos
        },
      } as never,
    })
    return { routes, pedidos: () => pedidosAoAuth }
  }

  test('põe o nome da leitura dos irmãos no Auth e tira quem não está nela', async () => {
    const { routes } = comIrmaos(
      { status: 200, body: doServico },
      { status: 200, body: { siblings: [{ id: IRMAO, name: ' Tomás ' }] } },
    )
    const r = await routes.arquipelagoIrmaos.GET()
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(await r.json()).toEqual({
      versao: 1,
      situacao: 'ok',
      irmaos: [
        { perfilId: IRMAO, percursos: { 'bosque-copas': recorde }, temCasa: true, nome: 'Tomás' },
      ],
    })
  })

  test('sem irmão (ou visitas desligadas) não pergunta ao Auth', async () => {
    const { routes, pedidos } = comIrmaos(
      { status: 200, body: { versao: 1, situacao: 'desligado', irmaos: [] } },
      { status: 200, body: { siblings: [] } },
    )
    expect(await (await routes.arquipelagoIrmaos.GET()).json()).toEqual({
      versao: 1,
      situacao: 'desligado',
      irmaos: [],
    })
    expect(pedidos()).toBe(0)
  })

  test('Auth fora ou resposta fora do contrato viram 502; recusa do serviço passa adiante', async () => {
    const semAuth = comIrmaos({ status: 200, body: doServico }, { status: 503, body: null })
    expect((await semAuth.routes.arquipelagoIrmaos.GET()).status).toBe(502)
    const estranha = comIrmaos(
      { status: 200, body: { ...doServico, versao: 9 } },
      { status: 200, body: { siblings: [] } },
    )
    expect((await estranha.routes.arquipelagoIrmaos.GET()).status).toBe(502)
    const fechada = comIrmaos(
      { status: 403, body: { error: { code: 'ACESSO_BLOQUEADO' } } },
      {
        status: 200,
        body: { siblings: [] },
      },
    )
    expect((await fechada.routes.arquipelagoIrmaos.GET()).status).toBe(403)
  })

  test('a casa do irmão: id conferido, repasse sem cache', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { versao: 1 } })
    const r = await routes.arquipelagoCasaDoIrmao.GET(new Request('http://local'), {
      params: Promise.resolve({ id: IRMAO }),
    })
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(chamadas.map((c) => c.caminho)).toEqual([`/arquipelago/irmaos/${IRMAO}/casa`])
    const torto = await routes.arquipelagoCasaDoIrmao.GET(new Request('http://local'), {
      params: Promise.resolve({ id: '../acesso' }),
    })
    expect(torto.status).toBe(400)
    expect(chamadas).toHaveLength(1)
  })
})

describe('visitas de outras crianças (N08a)', () => {
  test('os convites ganham o nome da grade do Auth; quem não está na grade sai', async () => {
    const OUTRO = '99999999-9999-4999-8999-999999999999'
    const amigos = {
      versao: 1,
      situacao: 'ok',
      convites: [
        { perfilId: PERFIL, ativo: true },
        { perfilId: OUTRO, ativo: false },
      ],
      casas: [{ id: '88888888-8888-4888-8888-888888888888', apelido: 'Casa da Lua' }],
    }
    const perfis = { status: 200, body: { profiles: [{ id: PERFIL, name: 'Lia' }] } }
    const { routes, chamadas } = montar({ status: 200, body: amigos }, perfis)
    const r = await routes.arquipelagoAmigosDaFamilia.GET()
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(await r.json()).toEqual({
      ...amigos,
      convites: [{ perfilId: PERFIL, ativo: true, nome: 'Lia' }],
    })
    expect(chamadas[0]).toMatchObject({
      caminho: '/arquipelago/familia/amigos',
      query: { perfis: PERFIL },
    })
    const estranha = montar({ status: 200, body: { versao: 1 } }, perfis)
    expect((await estranha.routes.arquipelagoAmigosDaFamilia.GET()).status).toBe(502)
  })

  test('desligar o convite e remover a casa conferem o id; a criança só lê', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { versao: 1 } })
    const ruim = await routes.arquipelagoConviteDeAmigo.DELETE(
      new Request('http://local/x?perfil=nao-e-uuid', { method: 'DELETE' }),
    )
    expect(ruim.status).toBe(400)
    await routes.arquipelagoConviteDeAmigo.DELETE(
      new Request(`http://local/x?perfil=${PERFIL}`, { method: 'DELETE' }),
    )
    await routes.arquipelagoRemoverAmigo.DELETE(
      new Request('http://local/x', { method: 'DELETE' }),
      {
        params: Promise.resolve({ id: IRMAO }),
      },
    )
    await routes.arquipelagoCasasDeAmigos.GET()
    await routes.arquipelagoCasaDeAmigo.GET(new Request('http://local/x'), {
      params: Promise.resolve({ id: IRMAO }),
    })
    expect(chamadas.map((c) => `${c.metodo} ${c.caminho}`)).toEqual([
      `DELETE /arquipelago/familia/amigos/convite/${PERFIL}`,
      `DELETE /arquipelago/familia/amigos/${IRMAO}`,
      'GET /arquipelago/amigos',
      `GET /arquipelago/amigos/${IRMAO}/casa`,
    ])
  })
})

describe('Python e Pro no Estúdio de desafio (C02b, 30/10/2026)', () => {
  const id = '22222222-2222-4222-8222-222222222222'
  const ctx = (valor: string) => ({ params: Promise.resolve({ id: valor }) })
  const post = (corpo: unknown, headers: Record<string, string> = {}) =>
    new Request(`http://kids.test/api/arquipelago/desafios/${id}/pro`, {
      method: 'POST',
      headers,
      body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    })

  async function nuvens() {
    const manifesto = await Bun.file(
      new URL('../../../docs/desafios-do-jogo/nuvens/nuvens-pro.manifesto.json', import.meta.url),
    ).json()
    return manifesto.desafios[0].conteudo.projetoInicial as {
      kind: 'pro'
      tree: Record<string, unknown>
      proMeta: { templateId: string }
    }
  }
  const aberto = (projetoInicial: unknown, revisao = 2) => ({
    status: 200,
    body: {
      id,
      jogadorId: PERFIL,
      blocosPermitidos: null,
      revisao,
      titulo: 'Nuvens',
      enunciado: 'Monte a grade.',
      dicas: [],
      desafioExtra: null,
      objetivos: [],
      projetoInicial,
      ultimosResultados: [],
      concluido: false,
    },
  })
  const ambienteAntes = {
    url: process.env.STUDIO_PRO_RUNTIME_URL,
    token: process.env.STUDIO_PRO_RUNTIME_TOKEN,
  }
  afterEach(() => {
    globalThis.fetch = fetchOriginal
    if (ambienteAntes.url === undefined) delete process.env.STUDIO_PRO_RUNTIME_URL
    else process.env.STUDIO_PRO_RUNTIME_URL = ambienteAntes.url
    if (ambienteAntes.token === undefined) delete process.env.STUDIO_PRO_RUNTIME_TOKEN
    else process.env.STUDIO_PRO_RUNTIME_TOKEN = ambienteAntes.token
  })

  test('ambiente: repassa o pedido do Estúdio ao serviço, sem cache', async () => {
    const { routes, chamadas } = montar({ status: 200, body: { version: 1 } })
    const corpo = { revisao: 2, pedido: { operation: 'analyze' } }
    const r = await routes.arquipelagoDesafioAmbiente.POST(
      new Request('http://local', { method: 'POST', body: JSON.stringify(corpo) }),
      ctx(id),
    )
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(chamadas).toEqual([
      { caminho: `/arquipelago/desafios/${id}/ambiente`, metodo: 'POST', corpo },
    ])
    expect(
      (
        await routes.arquipelagoDesafioAmbiente.POST(
          new Request('http://local', { method: 'POST', body: '{"revisao":1}' }),
          ctx('x'),
        )
      ).status,
    ).toBe(400)
    const grande = JSON.stringify({ revisao: 1, pedido: { x: 'a'.repeat(2 * 1024 * 1024) } })
    expect(
      (
        await routes.arquipelagoDesafioAmbiente.POST(
          new Request('http://local', { method: 'POST', body: grande }),
          ctx(id),
        )
      ).status,
    ).toBe(400)
    expect(chamadas).toHaveLength(1)
  })

  test('Pro: corpo que não é Pro não sai do BFF; o jogo que recusa abrir decide', async () => {
    const inicial = await nuvens()
    const { routes, chamadas } = montar({ status: 403, body: { error: { code: 'X' } } })
    expect((await routes.arquipelagoDesafioPro.POST(post({ revisao: 2 }), ctx(id))).status).toBe(
      400,
    )
    expect(
      (await routes.arquipelagoDesafioPro.POST(post({ revisao: 2, project: inicial }), ctx('x')))
        .status,
    ).toBe(400)
    expect(chamadas).toEqual([])
    const r = await routes.arquipelagoDesafioPro.POST(
      post({ revisao: 2, project: inicial }),
      ctx(id),
    )
    expect(r.status).toBe(403)
    expect(chamadas.map((c) => [c.caminho, c.metodo])).toEqual([
      [`/arquipelago/desafios/${id}`, 'GET'],
    ])
  })

  test('Pro: outra revisão é 409, desafio que não é Pro é 403, sem executor é 503', async () => {
    const inicial = await nuvens()
    globalThis.fetch = (async () => {
      throw new Error('o executor não deveria ser chamado')
    }) as unknown as typeof fetch
    const outra = montar(aberto(inicial, 3))
    expect(
      (
        await outra.routes.arquipelagoDesafioPro.POST(
          post({ revisao: 2, project: inicial }),
          ctx(id),
        )
      ).status,
    ).toBe(409)
    const classico = montar(aberto({ files: { 'script.js': '' } }))
    expect(
      (
        await classico.routes.arquipelagoDesafioPro.POST(
          post({ revisao: 2, project: inicial }),
          ctx(id),
        )
      ).status,
    ).toBe(403)
    delete process.env.STUDIO_PRO_RUNTIME_URL
    delete process.env.STUDIO_PRO_RUNTIME_TOKEN
    const semExecutor = montar(aberto(inicial))
    expect(
      (
        await semExecutor.routes.arquipelagoDesafioPro.POST(
          post({ revisao: 2, project: inicial }),
          ctx(id),
        )
      ).status,
    ).toBe(503)
  })

  test('Pro: o modelo vem do inicial, não do projeto enviado; a execução é do jogador e do desafio', async () => {
    const inicial = await nuvens()
    process.env.STUDIO_PRO_RUNTIME_URL = 'https://runtime.test/'
    process.env.STUDIO_PRO_RUNTIME_TOKEN = 'token-do-executor-de-teste'
    const enviados: { url: string; corpo: Record<string, unknown> }[] = []
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      enviados.push({ url: String(url), corpo: JSON.parse(String(init?.body)) })
      return Response.json({ ok: false, message: 'Erro de compilação de teste' }, { status: 422 })
    }) as unknown as typeof fetch
    const { routes } = montar(aberto(inicial))
    const trocado = { ...inicial, proMeta: { ...inicial.proMeta, templateId: 'outro-modelo' } }
    const r = await routes.arquipelagoDesafioPro.POST(
      post({ revisao: 2, project: trocado }),
      ctx(id),
    )
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(((await r.json()) as { error: { message: string } }).error.message).toBe(
      'Erro de compilação de teste',
    )
    expect(enviados).toHaveLength(1)
    expect(enviados[0]?.url).toBe('https://runtime.test/v1/build')
    expect(enviados[0]?.corpo.templateId).toBe(inicial.proMeta.templateId)
    expect(enviados[0]?.corpo.executionId).toMatch(/^arquipelago-[a-f0-9]{48}$/)
  })
})
