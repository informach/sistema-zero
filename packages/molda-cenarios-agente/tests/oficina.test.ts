import { expect, test } from 'bun:test'
import { criarHostEmMemoria } from '@sistemazero/molda-cenarios/oficina/host-memoria'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { capturarPelaOficina } from '../src/oficina/captura'
import { criarClienteDaOficina } from '../src/oficina/cliente'
import { criarContexto, executarFerramenta, FERRAMENTAS } from '../src/oficina/ferramentas'
import { CenarioMudou, criarIntencoes } from '../src/oficina/intencoes'
import { lerGuia, listarFerramentas } from '../src/oficina/mcp'

test('o cliente recusa endereço inseguro e e-mail sem o gateway para entrar', () => {
  expect(() => criarClienteDaOficina({ app: 'http://example.com', token: 'x' })).toThrow('HTTPS')
  expect(() => criarClienteDaOficina({ app: 'https://u:p@example.com', token: 'x' })).toThrow(
    'inválido',
  )
  expect(() => criarClienteDaOficina({ app: 'https://app.example.com' })).toThrow('token')
  expect(() =>
    criarClienteDaOficina({ app: 'https://app.example.com', email: 'a@b.c', senha: 'x' }),
  ).toThrow('gateway')
})

test('o token vai no cabeçalho do app, renova uma vez num 401 e nunca vai ao armazenamento', async () => {
  const pedidos: Array<{ url: string; autorizacao: string | null }> = []
  let entradas = 0
  const buscar = async (url: string, opcoes: RequestInit = {}) => {
    const autorizacao = new Headers(opcoes.headers).get('authorization')
    pedidos.push({ url, autorizacao })
    if (url === 'https://gw.example.com/auth/login') {
      entradas++
      return Response.json({ tokens: { accessToken: 'novo-token-de-acesso', refreshToken: 'r' } })
    }
    if (url.startsWith('https://r2.example.com/')) return new Response(new Uint8Array([1, 2]))
    if (url.endsWith('/api/cenarios/espacos'))
      return autorizacao === 'Bearer novo-token-de-acesso'
        ? Response.json([{ id: 'e1', tipo: 'conta', usadoBytes: 0, limiteBytes: 1 }])
        : Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
    return new Response(null, { status: 404 })
  }
  const { host } = criarClienteDaOficina(
    {
      app: 'https://app.example.com/',
      gateway: 'https://gw.example.com',
      token: 'token-vencido-123456',
      email: 'equipe@example.com',
      senha: 'segredo',
    },
    buscar,
  )
  expect(await host.espacos()).toEqual([
    { id: 'e1', tipo: 'conta', usadoBytes: 0, limiteBytes: 1, nome: 'Meu espaço' },
  ])
  expect(entradas).toBe(1)
  expect(pedidos.map((p) => [p.url, p.autorizacao])).toEqual([
    ['https://app.example.com/api/cenarios/espacos', 'Bearer token-vencido-123456'],
    ['https://gw.example.com/auth/login', null],
    ['https://app.example.com/api/cenarios/espacos', 'Bearer novo-token-de-acesso'],
  ])
})

/** O pedido de prova, sem servidor: ilha, lago, farol, trilha até ele e árvores em volta. */
async function ilhaNoHostEmMemoria() {
  const host = criarHostEmMemoria({ equipe: true })
  const biblioteca = await host.criarBiblioteca('conta', {
    nome: 'Natureza',
    licenca: 'propria',
  })
  const modelo = async (nome: string, max: [number, number, number]) => {
    const conteudo = new TextEncoder().encode(`glb de ensaio: ${nome}`)
    const [m] = await host.importarModelos(biblioteca.id, [
      {
        nome,
        pasta: '',
        etiquetas: [],
        conteudo,
        digest: await digestDosBytes(conteudo),
        miniatura: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
        min: [-max[0] / 2, 0, -max[2] / 2],
        max: [max[0] / 2, max[1], max[2] / 2],
        triangulos: 120,
      },
    ])
    return { bibliotecaId: biblioteca.id, modeloId: m!.id, digest: m!.digest }
  }
  const farol = await modelo('Farol', [3, 9, 3]),
    arvore = await modelo('Árvore', [2, 5, 2])
  const mundo = await host.criarMundo('conta', 'Ilha do agente')
  await host.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
  const cenario = await host.criarCenario(mundo.id, 'Ilha')
  return { host, cenario, farol, arvore }
}

test('cada intenção é um lote só, um passo de desfazer, e a ilha fica como pedida', async () => {
  const { host, cenario, farol, arvore } = await ilhaNoHostEmMemoria()
  const a = criarIntencoes(host)
  const id = cenario.id
  const passos = async () => (await host.abrirCenario(id)).historico.desfazer

  await a.gerarTerreno(id, { tipo: 'ilha', altura: 14, semente: 7 })
  expect(await passos()).toBe(1)
  const [centro] = await a.consultarPontos(id, [{ x: 0, z: 0 }])
  expect(centro!.chao).toBe(true)
  expect(centro!.altura!).toBeGreaterThan(5)

  // Uma bacia cavada na encosta e o lago enchendo nela, abaixo da borda.
  const bacia = { x: -12, z: -8 }
  const [borda] = await a.consultarPontos(id, [{ x: -12, z: -1 }])
  await a.esculpirTerreno(id, {
    parametros: { ferramenta: 'abaixar', raio: 6, forca: 1, metros: 4 },
    pontos: [bacia],
  })
  expect(await passos()).toBe(2)
  const [fundo] = await a.consultarPontos(id, [bacia])
  expect(fundo!.altura!).toBeLessThan(borda!.altura!)
  const lago = await a.encherAgua(id, {
    nome: 'Lago',
    intencao: { tipo: 'lago', ponto: bacia, nivel: fundo!.altura! + 1 },
  })
  expect(lago.criados).toHaveLength(1)
  expect(await passos()).toBe(3)
  const [noLago, noCentro] = await a.consultarPontos(id, [bacia, { x: 0, z: 0 }])
  expect(noLago!.agua?.id).toBe(lago.criados[0])
  expect(noCentro!.agua).toBeNull()

  const posto = await a.colocarModelo(id, { ...farol, x: 25, z: 0 })
  expect(await passos()).toBe(4)
  const trilha = await a.tracarCaminho(id, {
    caminho: {
      tipo: 'trilha',
      nome: 'Trilha do farol',
      pontos: [
        { x: 8, z: 8 },
        { x: 18, z: 4 },
        { x: 25, z: 2 },
      ],
      largura: 2,
      acabamento: null,
    },
  })
  expect(await passos()).toBe(5)

  const arvores = await a.espalhar(id, {
    modelos: [arvore],
    centro: { x: 0, z: 0 },
    raio: 40,
    densidade: 1,
    afastamento: 4,
    limite: 30,
    semente: 11,
  })
  expect(arvores.criados.length).toBeGreaterThan(0)
  expect(await passos()).toBe(6)

  // O orçamento conta pelos dados dos modelos (120 triângulos cada) e cabe em todo destino.
  const conta = await a.orcamento(id)
  expect(conta.objetos).toBe(1 + arvores.criados.length)
  expect(conta.modelosDiferentes).toBe(2)
  expect(conta.triangulos).toBe(120 * conta.objetos)
  expect(Object.values(conta.destinos).every((d) => d.cabe)).toBe(true)
  // A busca no espaço acha pelo tamanho: o farol tem 9 m de altura, a árvore 5 m.
  const altos = await host.buscarModelosNoEspaco('conta', { alturaMin: 8 })
  expect(altos.itens.map((m) => m.nome)).toEqual(['Farol'])

  // Nenhuma árvore dentro do lago, e a região em volta do farol mostra o farol e a trilha.
  const doc = (await host.abrirCenario(id)).documento
  const posicoes = doc.instancias
    .filter((o) => arvores.criados.includes(o.id))
    .map((o) => o.transformacao.posicao)
  const naAgua = await a.consultarPontos(id, posicoes)
  expect(naAgua.every((p) => p.agua === null)).toBe(true)
  const regiao = await a.consultarRegiao(id, { x0: 20, z0: -5, x1: 30, z1: 5 })
  expect(regiao.objetos.map((o) => o.id)).toContain(posto.criados[0])
  expect(regiao.caminhos.map((c) => c.id)).toContain(trilha.criados[0])

  // Desfazer volta um passo por vez: as árvores saem, o resto fica.
  const depois = await a.moverHistorico(id, 'desfazer')
  expect(depois.desfazer).toBe(5)
  const semArvores = (await host.abrirCenario(id)).documento
  expect(semArvores.instancias.some((o) => arvores.criados.includes(o.id))).toBe(false)
  expect(semArvores.instancias.some((o) => o.id === posto.criados[0])).toBe(true)
})

test('com a revisão esperada vencida nada é gravado; validar não grava', async () => {
  const { host, cenario } = await ilhaNoHostEmMemoria()
  const a = criarIntencoes(host)
  const antes = (await host.abrirCenario(cenario.id)).revisao
  await a.gerarTerreno(cenario.id, { tipo: 'plano', altura: 2 })
  await expect(
    a.gerarTerreno(cenario.id, { tipo: 'plano', altura: 3 }, { revisaoEsperada: antes }),
  ).rejects.toBeInstanceOf(CenarioMudou)
  const v = await a.validarLote(cenario.id, [{ tipo: 'cenario.renomear', nome: 'Outra' }])
  expect(v.valido).toBe(true)
  expect((await host.abrirCenario(cenario.id)).resumo.nome).toBe('Ilha')
  const ruim = await a.validarLote(cenario.id, [{ tipo: 'instancia.remover', id: 'nao-existe' }])
  expect(ruim.valido).toBe(false)
})

test('as ferramentas publicam um JSON Schema válido e conferem a entrada antes do serviço', async () => {
  const lista = listarFerramentas()
  expect(lista.map((f) => f.name)).toEqual(FERRAMENTAS.map((f) => f.name))
  for (const f of lista) expect(f.inputSchema.type).toBe('object')
  let chamou = false
  const memoria = criarHostEmMemoria()
  const contexto = criarContexto({
    ...memoria,
    abrirCenario: (id: string) => {
      chamou = true
      return memoria.abrirCenario(id)
    },
  })
  const r = await executarFerramenta(contexto, 'gerar_terreno', {
    cenarioId: 'nao-e-uuid',
    receita: { tipo: 'ilha' },
  })
  expect(r.ok).toBe(false)
  expect(chamou).toBe(false)
  expect(await executarFerramenta(contexto, 'nao-existe', {})).toEqual({
    ok: false,
    erro: { erro: 'Ferramenta desconhecida' },
  })
})

test('pela oficina aberta: espera o retrato da revisão atual e o baixa com o token', async () => {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'M'),
    c = await host.criarCenario(mundo.id, 'C')
  await host.editarCenario(c.id, 0, [{ tipo: 'cenario.renomear', nome: 'Ilha' }], 'op-00000001')
  const baixados: string[] = []
  const baixar = async (endereco: string) => {
    baixados.push(endereco)
    return new Uint8Array([82, 73, 70, 70])
  }
  // Sem a oficina aberta, ninguém fotografa a revisão 1: a captura recusa no prazo.
  await expect(
    capturarPelaOficina(host, baixar, c.id, { prazoMs: 50, intervaloMs: 10 }),
  ).rejects.toThrow('aba à vista')
  // A oficina fotografou a revisão atual (o retrato automático de toda revisão estável).
  await host.guardarCapa(c.id, 1, new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }))
  const foto = await capturarPelaOficina(host, baixar, c.id, { prazoMs: 50, intervaloMs: 10 })
  expect(foto).toMatchObject({ revisao: 1, origem: 'oficina', tipo: 'image/webp' })
  expect(baixados).toHaveLength(1)
})

test('o guia vai como recurso do MCP e cita toda ferramenta', () => {
  const guia = lerGuia()
  expect(guia).toContain('Oficina de cenários para agentes')
  for (const f of FERRAMENTAS) expect(guia).toContain(`\`${f.name}\``)
})
