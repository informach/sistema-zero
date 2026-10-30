import { afterEach, describe, expect, test } from 'bun:test'
import {
  caminhoDoJogo,
  criarPlataformaDoArquipelago,
  lerFerramentasMolda,
  pertenceAoPerfil,
} from '../src/components/arquipelago-host'

const fetchOriginal = globalThis.fetch
afterEach(() => {
  globalThis.fetch = fetchOriginal
})

function servir(rotas: Record<string, { status: number; body: unknown }>) {
  const pedidos: { url: string; method: string; body?: string; signal?: AbortSignal | null }[] = []
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    pedidos.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body as string | undefined,
      signal: init?.signal,
    })
    const r = rotas[`${init?.method ?? 'GET'} ${url}`] ?? { status: 404, body: null }
    return Response.json(r.body, { status: r.status })
  }) as unknown as typeof fetch
  return pedidos
}

const plataforma = () =>
  criarPlataformaDoArquipelago({
    publico: 'kids',
    perfil: { id: 'p1', primeiroNome: 'Lia' },
    voltarPara: '/',
  })

test('trajetos usam somente os percursos conhecidos e a leitura do irmão fica no Kids', async () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const caminho = `/irmaos/${id}/fantasmas/bosque-copas`
  for (const p of ['/fantasmas', '/fantasmas/nuvens-balao', caminho])
    expect(caminhoDoJogo(p)).toBe(true)
  for (const p of [
    '/fantasmas/outro',
    `/irmaos/${id}/fantasmas/outro`,
    '/fantasmas/bosque-copas?perfil=outro',
    '/irmaos/qualquer/fantasmas/bosque-copas',
  ])
    expect(caminhoDoJogo(p)).toBe(false)
  const pedidos = servir({
    [`GET /api/arquipelago${caminho}`]: { status: 200, body: { versao: 1, situacao: 'ausente' } },
  })
  expect((await plataforma().servico.buscar(caminho)).status).toBe(200)
  const adulto = criarPlataformaDoArquipelago({
    publico: 'adulto',
    perfil: { id: 'adulto', primeiroNome: 'Pessoa' },
    voltarPara: '/',
  })
  expect((await adulto.servico.buscar(caminho)).status).toBe(404)
  expect(pedidos).toHaveLength(1)
})

describe('a porta da plataforma para o jogo', () => {
  test('host repassa operações econômicas exatas nos dois públicos e preserva corpo/sinal', async () => {
    for (const publico of ['kids', 'adulto'] as const) {
      const p = criarPlataformaDoArquipelago({
        publico,
        perfil: { id: 'p1', primeiroNome: 'Lia' },
        voltarPara: '/',
      })
      for (const [metodo, caminho] of [
        ['GET', '/desafios/cores'],
        ['GET', '/insumos/pendente'],
        ['POST', '/insumos/comprar'],
        ['GET', '/pedidos/pendentes'],
        ['POST', '/pedidos/entregar'],
        ['POST', '/profissoes/iniciar'],
        ['POST', '/profissoes/concluir'],
      ] as const) {
        const chamadas = servir({
          [`${metodo} /api/arquipelago${caminho}`]: { status: 200, body: { confirmado: true } },
        })
        const sinal = new AbortController().signal
        const r = await p.servico.buscar(caminho, {
          metodo,
          sinal,
          ...(metodo === 'POST' ? { corpo: { chave: 'comando' } } : {}),
        })
        expect(r).toEqual({ status: 200, corpo: { confirmado: true } })
        expect(chamadas).toHaveLength(1)
        expect(chamadas[0]?.signal).toBe(sinal)
        if (metodo === 'POST') expect(JSON.parse(chamadas[0]!.body!)).toEqual({ chave: 'comando' })
      }
      for (const caminho of [
        '/pedidos/apagar',
        '/insumos/comprar/extra',
        '/profissoes/aprovar',
        '/pedidos/pendentes?perfil=outro',
      ]) {
        const chamadas = servir({})
        expect((await p.servico.buscar(caminho)).status).toBe(404)
        expect(chamadas).toHaveLength(0)
      }
    }
  })
  test('troca de perfil impede abrir ferramenta no armazenamento anterior', () => {
    expect(pertenceAoPerfil({ viewerId: 'nova-crianca' }, 'crianca-anterior')).toBe(false)
    expect(pertenceAoPerfil({ viewerId: 'crianca-anterior' }, 'crianca-anterior')).toBe(true)
    expect(pertenceAoPerfil(null, 'crianca-anterior')).toBe(false)
  })
  test('encaminha o pedido da ferramenta ao host e devolve somente o resultado dele', async () => {
    const pedido = { ferramenta: 'pinta' as const, proposito: 'criar personagem' }
    const recebidos: unknown[] = []
    const p = criarPlataformaDoArquipelago({
      publico: 'kids',
      perfil: { id: 'p1', primeiroNome: 'Lia' },
      voltarPara: '/',
      async abrirFerramenta(value) {
        recebidos.push(value)
        return { situacao: 'pronto', criacaoId: 'real' }
      },
    })
    expect(await p.abrirFerramenta(pedido)).toEqual({ situacao: 'pronto', criacaoId: 'real' })
    expect(recebidos).toEqual([pedido])
  })
  test('paleta Molda exige resposta explícita e bem formada', () => {
    expect(lerFerramentasMolda(undefined)).toEqual({ ok: false })
    expect(
      lerFerramentasMolda({ allow: ['basico'], upcoming: [{ when: 'depois', families: [1] }] }),
    ).toEqual({ ok: false })
    expect(lerFerramentasMolda(null)).toEqual({ ok: true, access: null })
    expect(lerFerramentasMolda({ allow: ['basico'] })).toEqual({
      ok: true,
      access: { allow: ['basico'] },
    })
  })
  test('a jornada vira a posição do posto (sem leitura, Faísca)', async () => {
    servir({
      'GET /api/members/gamification/me': { status: 200, body: { level: { slug: 'explorer' } } },
    })
    expect(await plataforma().lerJornada()).toEqual({ posicao: 4 })
    servir({})
    expect(await plataforma().lerJornada()).toEqual({ posicao: 1 })
  })

  test('o adulto usa a etapa da sua própria jornada', async () => {
    servir({
      'GET /api/members/gamification/me': {
        status: 200,
        body: {
          journey: {
            configured: true,
            stages: [
              { id: 'um', title: 'Um', completed: true },
              { id: 'dois', title: 'Dois', completed: false },
            ],
          },
        },
      },
    })
    const adulto = criarPlataformaDoArquipelago({
      publico: 'adulto',
      perfil: { id: 'a1', primeiroNome: 'Lia' },
      voltarPara: '/',
    })
    expect(await adulto.lerJornada()).toEqual({ posicao: 2 })
  })

  test('avatar e quarto pelas mesmas rotas das telas da plataforma', async () => {
    const state = { theme: 'padrao', placedItems: [{ itemId: 'cama', x: 0, y: 1 }], pet: null }
    const pedidos = servir({
      'GET /api/members/avatar': {
        status: 200,
        body: { equipped: { hair: { asset: 'hair-13' } } },
      },
      'GET /api/members/room': { status: 200, body: { state } },
      'PUT /api/members/room': { status: 200, body: state },
    })
    const p = plataforma()
    expect(await p.lerAvatar()).toEqual({ slots: { hair: { asset: 'hair-13' } } })
    expect(await p.lerQuarto()).toEqual(state)
    expect(await p.salvarQuarto(state)).toEqual(state)
    expect(pedidos.at(-1)).toMatchObject({ method: 'PUT', body: JSON.stringify(state) })
  })

  test('o serviço só alcança as rotas do jogo', async () => {
    const pedidos = servir({
      'POST /api/arquipelago/tempo/recuperar': { status: 200, body: { acabou: false } },
    })
    const p = plataforma()
    const sinal = new AbortController().signal
    expect(
      await p.servico.buscar('/tempo/recuperar', {
        metodo: 'POST',
        corpo: { segundos: 60 },
        sinal,
      }),
    ).toEqual({
      status: 200,
      corpo: { acabou: false },
    })
    expect((await p.servico.buscar('/familia/limite', { metodo: 'PUT' })).status).toBe(404)
    expect(pedidos.map((x) => x.url)).toEqual(['/api/arquipelago/tempo/recuperar'])
    expect(pedidos[0]?.signal).toBe(sinal)
    expect(await p.abrirFerramenta({ ferramenta: 'pinta', proposito: 'x' })).toMatchObject({
      situacao: 'indisponivel',
    })
  })

  test('desafios: lista, abrir e prêmio visto; conferir só pela página', () => {
    const id = '22222222-2222-4222-8222-222222222222'
    for (const ok of [
      '/desafios',
      '/desafios/cores',
      '/desafios?ilha=bosque',
      `/desafios/${id}`,
      `/desafios/${id}/recompensa-vista`,
    ])
      expect(caminhoDoJogo(ok)).toBe(true)
    for (const nao of [
      `/desafios/${id}/verificar`,
      '/desafios/nao-uuid',
      '/desafios/cores?perfil=outra-pessoa',
      '/desafios/cores/../admin',
      '/desafios?ilha=../admin',
      '/desafios?ilha=bosque&x=1',
      '/admin/desafios',
      '/familia/limite',
    ])
      expect(caminhoDoJogo(nao)).toBe(false)
  })

  test('galeria: o jogo lê e compra; nada além desses dois caminhos', () => {
    for (const ok of ['/galeria', '/galeria/compras']) expect(caminhoDoJogo(ok)).toBe(true)
    for (const nao of ['/galeria/', '/galeria/compras/x', '/galeria?saldo=999'])
      expect(caminhoDoJogo(nao)).toBe(false)
  })

  test('irmãos e visitas (fase3-12): a lista e a casa de um irmão por uuid, nada mais', () => {
    const id = '33333333-3333-4333-8333-333333333333'
    for (const ok of ['/irmaos', `/irmaos/${id}/casa`]) expect(caminhoDoJogo(ok)).toBe(true)
    for (const nao of [
      '/irmaos/',
      `/irmaos/${id}`,
      `/irmaos/${id}/casa/x`,
      '/irmaos/abc/casa',
      '/irmaos?perfis=1',
    ])
      expect(caminhoDoJogo(nao)).toBe(false)
  })

  test('a sessão de tempo passa apenas pelo host Kids', async () => {
    const pedidos = servir({
      'POST /api/arquipelago/tempo/sessao': { status: 200, body: { situacao: 'ativa' } },
    })
    const comando = { sessaoId: 'id', sequencia: 0, acao: 'iniciar' }
    expect(
      await plataforma().servico.buscar('/tempo/sessao', { metodo: 'POST', corpo: comando }),
    ).toEqual({
      status: 200,
      corpo: { situacao: 'ativa' },
    })
    const adulto = criarPlataformaDoArquipelago({
      publico: 'adulto',
      perfil: { id: 'a1', primeiroNome: 'Lia' },
      voltarPara: '/',
    })
    expect(
      (await adulto.servico.buscar('/tempo/sessao', { metodo: 'POST', corpo: comando })).status,
    ).toBe(404)
    expect(pedidos.map((p) => p.url)).toEqual(['/api/arquipelago/tempo/sessao'])
  })

  test('irmãos, recordes e visitas também ficam só no Kids', async () => {
    const id = '11111111-1111-4111-8111-111111111111'
    const pedidos = servir({
      'GET /api/arquipelago/irmaos': { status: 200, body: { situacao: 'ok', irmaos: [] } },
    })
    expect((await plataforma().servico.buscar('/irmaos')).status).toBe(200)
    const adulto = criarPlataformaDoArquipelago({
      publico: 'adulto',
      perfil: { id: 'a1', primeiroNome: 'Lia' },
      voltarPara: '/',
    })
    for (const caminho of ['/irmaos', `/irmaos/${id}/casa`, '/tempo/recuperar'])
      expect((await adulto.servico.buscar(caminho)).status).toBe(404)
    expect(pedidos.map((p) => p.url)).toEqual(['/api/arquipelago/irmaos'])
  })
})
