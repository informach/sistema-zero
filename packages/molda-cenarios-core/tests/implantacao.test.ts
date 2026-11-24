import { expect, test } from 'bun:test'
import {
  type AvisoDeImplantacao,
  type CaminhoDeCenario,
  conferirImplantacao,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  type InstanciaDeCenario,
  leitorDoChao,
  PecaDeTerrenoAusente,
} from '../src/v2'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  codificarPecaDeAlturas,
  lerPecaDeAlturas,
} from '../src/v2/terreno'

type P = { x: number; y: number; z: number }
const caixa = (min: P, max: P) => ({ min, max })
const MODELOS: DocumentoDeCenario['modelos'] = [
  ['caixa', caixa({ x: -1, y: 0, z: -1 }, { x: 1, y: 2, z: 1 })],
  ['fina', caixa({ x: -1, y: 0, z: -1 }, { x: 1, y: 0.01, z: 1 })],
  ['laje', caixa({ x: -1, y: 0, z: -1 }, { x: 1, y: 0.1, z: 1 })],
  ['ponte', caixa({ x: -1.5, y: 0, z: -4 }, { x: 1.5, y: 1, z: 4 })],
  ['arvore', caixa({ x: -2, y: 0, z: -2 }, { x: 2, y: 6, z: 2 })],
].map(([id, volume]) => ({
  id: id as string,
  biblioteca: 'bib',
  modelo: id as string,
  digest: 'a'.repeat(64),
  volume: volume as ReturnType<typeof caixa>,
}))

function objeto(
  id: string,
  modelo: string,
  x: number,
  z: number,
  extra: Partial<InstanciaDeCenario> & { deslocamento?: number } = {},
): InstanciaDeCenario {
  const { deslocamento = 0, ...resto } = extra
  return {
    id,
    nome: id,
    modelo,
    grupo: null,
    bloqueado: false,
    oculto: false,
    colisao: 'caixa',
    apoio: { tipo: 'terreno', deslocamento, inclinar: false },
    transformacao: {
      posicao: { x, y: 0, z },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
    ...resto,
  }
}
function absoluto(id: string, modelo: string, p: P, extra: Partial<InstanciaDeCenario> = {}) {
  return objeto(id, modelo, p.x, p.z, {
    apoio: { tipo: 'absoluto' },
    transformacao: {
      posicao: p,
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
    ...extra,
  })
}
const entidade = (id: string) => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
})
function trilha(
  id: string,
  pontos: { x: number; z: number }[],
  largura = 2,
): Extract<CaminhoDeCenario, { tipo: 'trilha' }> {
  return { ...entidade(id), tipo: 'trilha', pontos, largura, acabamento: null }
}
function cena(instancias: InstanciaDeCenario[], caminhos: CaminhoDeCenario[] = []) {
  const d = criarDocumentoVazio('c', 'Implantação')
  d.base = { tipo: 'plano', largura: 1024, comprimento: 1024 }
  d.modelos = MODELOS
  d.instancias = instancias
  d.caminhos = caminhos
  return d
}
const de = (avisos: AvisoDeImplantacao[], id: string) =>
  avisos
    .filter((a) => a.id === id)
    .map((a) => a.tipo)
    .sort()

/** Um relevo de verdade (uma peça de 64 m, passo 1) com a altura pedida por amostra. */
function relevo(altura: (x: number, z: number) => number) {
  const base: BaseDeTerreno = {
    tipo: 'terreno',
    origem: { x: -32, z: -32 },
    passo: 1,
    colunas: 64,
    linhas: 64,
    min: 0,
    max: 64,
    fundo: 0,
    pecas: [{ coluna: 0, linha: 0, digest: 'd'.repeat(64) }],
  }
  const amostras = Float64Array.from({ length: AMOSTRAS_DA_PECA }, (_, i) =>
    altura(-32 + (i % 65), -32 + Math.floor(i / 65)),
  )
  const peca = lerPecaDeAlturas(codificarPecaDeAlturas(amostras, 0, 64))
  return { base, chao: leitorDoChao(base, new Map([['d'.repeat(64), peca]])) }
}

test('flutuando: um canto da base acima de 15 cm; apoio em outro objeto não conta', () => {
  const doc = cena([
    objeto('alto', 'caixa', 0, 0, { deslocamento: 0.5 }),
    objeto('assentado', 'caixa', 10, 0),
    objeto('quase', 'caixa', 20, 0, { deslocamento: 0.1 }),
    objeto('mesa', 'caixa', 30, 0),
    objeto('vaso', 'caixa', 30, 0, {
      apoio: { tipo: 'objeto', objeto: 'mesa', deslocamento: 0, contato: { x: 0, y: 2, z: 0 } },
    }),
  ])
  const avisos = conferirImplantacao(doc)
  expect(de(avisos, 'alto')).toEqual(['flutuando'])
  expect(avisos.find((a) => a.id === 'alto')?.detalhe).toContain('0,50 m')
  for (const id of ['assentado', 'quase', 'mesa', 'vaso']) expect(de(avisos, id)).toEqual([])
  for (const a of avisos) expect(a.mensagem).not.toContain('—')
})

test('flutuando na encosta: assentado pelo centro, o canto de baixo fica no ar', () => {
  const { base, chao } = relevo((x) => 10 + 0.2 * x)
  const doc = cena([objeto('casa', 'caixa', 0, 0), objeto('banquinho', 'laje', 10, 0)])
  doc.base = base
  doc.modelos = [
    ...MODELOS,
    {
      id: 'banquinho',
      biblioteca: 'bib',
      modelo: 'banquinho',
      digest: 'a'.repeat(64),
      volume: caixa({ x: -0.2, y: 0, z: -0.2 }, { x: 0.2, y: 0.5, z: 0.2 }),
    },
  ]
  doc.instancias[1]!.modelo = 'banquinho'
  const avisos = conferirImplantacao(doc, chao)
  // A 2 × 2 m em rampa de 20%: o canto de baixo fica uns 20 cm acima do chão.
  expect(de(avisos, 'casa')).toEqual(['flutuando'])
  expect(de(avisos, 'banquinho')).toEqual([])
  expect(() => conferirImplantacao(doc)).toThrow(PecaDeTerrenoAusente)
})

test('enterrado: mais de 30% da altura abaixo do chão, salvo a parte enterrada marcada', () => {
  const enterrada = (n: number) => ({ propriedades: { 'arquipelago.enterrada': n } })
  const avisos = conferirImplantacao(
    cena([
      objeto('fundo', 'caixa', 0, 0, { deslocamento: -1 }),
      objeto('raso', 'caixa', 10, 0, { deslocamento: -0.4 }),
      objeto('afloramento', 'caixa', 20, 0, { deslocamento: -1, ...enterrada(0.5) }),
      objeto('afundou', 'caixa', 30, 0, { deslocamento: -1.6, ...enterrada(0.5) }),
      objeto('sumiu', 'fina', 40, 0, { deslocamento: -0.5 }),
    ]),
  )
  expect(de(avisos, 'fundo')).toEqual(['enterrado'])
  expect(avisos.find((a) => a.id === 'fundo')?.detalhe).toContain('50%')
  expect(de(avisos, 'raso')).toEqual([])
  expect(de(avisos, 'afloramento')).toEqual([])
  expect(de(avisos, 'afundou')).toEqual(['enterrado'])
  expect(avisos.find((a) => a.id === 'afundou')?.detalhe).toContain('marcada é 50%')
  expect(de(avisos, 'sumiu')).toEqual(['enterrado'])
})

test('sólido no caminho: faixa andável, não cerca; pontes, troncos e peças pisáveis ficam de fora', () => {
  const pontes: CaminhoDeCenario[] = [
    {
      ...entidade('ponte-do-rio'),
      tipo: 'ponte',
      pontos: [
        { x: 50, z: -10 },
        { x: 50, z: 10 },
      ],
      largura: 3,
      acabamento: null,
      cotas: { de: 3, ate: 3 },
      espessura: 0.2,
      guardas: true,
      alturaDaGuarda: 0.7,
    },
    {
      ...entidade('cerca'),
      tipo: 'cerca',
      pontos: [
        { x: -20, z: 10 },
        { x: 20, z: 10 },
      ],
      largura: 0.2,
      acabamento: null,
      altura: 1.2,
      comprimentoDoModulo: 2,
    },
    {
      ...entidade('praca'),
      tipo: 'praca',
      pontos: [
        { x: 60, z: -5 },
        { x: 70, z: -5 },
        { x: 70, z: 5 },
        { x: 60, z: 5 },
      ],
      largura: 1,
      acabamento: null,
    },
  ]
  const tronco = { propriedades: { 'arquipelago.fisica': 'tronco' } }
  const avisos = conferirImplantacao(
    cena(
      [
        objeto('no-meio', 'caixa', 0, 0),
        objeto('na-beira', 'caixa', -5, 1.9),
        objeto('ao-lado', 'caixa', 5, 2.5),
        objeto('sem-colisao', 'caixa', 8, 0, { colisao: 'nenhuma' }),
        objeto('na-cerca', 'caixa', 0, 10),
        objeto('ponte-de-catalogo', 'ponte', 30, 0, {
          colisao: 'malha',
          propriedades: { 'arquipelago.fisica': 'ponte' },
        }),
        objeto('barco-embaixo', 'caixa', 50, 0),
        absoluto('banco-na-ponte', 'caixa', { x: 50, y: 3, z: 4 }),
        objeto('chafariz', 'caixa', 65, 0),
        objeto('na-borda-da-praca', 'caixa', 70, 8.5),
        objeto('cruza-a-borda', 'caixa', 70.5, 0),
        objeto('arvore-com-tronco', 'arvore', -10, 2.5, tronco),
        objeto('arvore-de-caixa', 'arvore', -14, 2.5),
      ],
      [
        trilha('trilha', [
          { x: -20, z: 0 },
          { x: 20, z: 0 },
        ]),
        trilha('sob-a-ponte', [
          { x: 30, z: -20 },
          { x: 30, z: 20 },
        ]),
        ...pontes,
      ],
    ),
  )
  const solidos = avisos.filter((a) => a.tipo === 'solido-no-caminho').map((a) => a.id)
  expect(solidos.sort()).toEqual(
    [
      'arvore-de-caixa',
      'banco-na-ponte',
      'chafariz',
      'cruza-a-borda',
      'na-beira',
      'no-meio',
    ].sort(),
  )
  expect(avisos.find((a) => a.id === 'no-meio')?.detalhe).toContain('"trilha"')
})

test('a faixa segue a curva suavizada e as esquinas do traçado', () => {
  const curva = trilha('curva', [
    { x: 0, z: 0 },
    { x: 20, z: 0 },
    { x: 20, z: 20 },
  ])
  const pequena = {
    id: 'pino',
    biblioteca: 'bib',
    modelo: 'pino',
    digest: 'a'.repeat(64),
    volume: caixa({ x: -0.1, y: 0, z: -0.1 }, { x: 0.1, y: 1, z: 0.1 }),
  }
  const doc = cena([
    objeto('na-esquina', 'pino', 20.6, -0.6),
    objeto('fora-da-esquina', 'pino', 21.6, -1.6),
    objeto('no-trecho', 'pino', 20.5, 10),
  ])
  doc.modelos = [...MODELOS, pequena]
  doc.caminhos = [curva]
  const solidos = conferirImplantacao(doc)
    .filter((a) => a.tipo === 'solido-no-caminho')
    .map((a) => a.id)
  expect(solidos.sort()).toEqual(['na-esquina', 'no-trecho'])
})

test('peça fina colada no chão, no piso do caminho ou na água pisca; laje erguida não', () => {
  const lago: DocumentoDeCenario['aguas'][number] = {
    ...entidade('lago'),
    tipo: 'lago',
    modelo: null,
    centro: { x: 200, z: 0 },
    giro: 0,
    escala: 1,
    nivel: 0.5,
    profundidade: 1,
    contorno: [
      { x: -5, z: -5 },
      { x: 5, z: -5 },
      { x: 5, z: 5 },
      { x: -5, z: 5 },
    ],
    recorte: [
      { x: -5, z: -5 },
      { x: 5, z: -5 },
      { x: 5, z: 5 },
      { x: -5, z: 5 },
    ],
  }
  const doc = cena(
    [
      objeto('tapete', 'fina', 100, 100),
      objeto('piso-na-trilha', 'fina', 0, 0),
      objeto('laje-erguida', 'fina', 5, 0, { deslocamento: 0.1 }),
      objeto('laje-grossa', 'laje', 10, 0),
      absoluto('vitoria-regia', 'fina', { x: 200, y: 0.49, z: 0 }),
      absoluto('folha-no-ar', 'fina', { x: 203, y: 0.8, z: 0 }),
    ],
    [
      trilha('trilha', [
        { x: -20, z: 0 },
        { x: 20, z: 0 },
      ]),
    ],
  )
  doc.aguas = [lago]
  const avisos = conferirImplantacao(doc)
  const planos = (id: string) =>
    avisos.filter((a) => a.id === id && a.tipo === 'quase-no-mesmo-plano')
  expect(planos('tapete')[0]?.detalhe).toBe('O topo fica a 0,01 m do chão.')
  expect(planos('piso-na-trilha')[0]?.detalhe).toContain('do caminho "trilha"')
  expect(planos('laje-erguida')).toHaveLength(0)
  expect(planos('laje-grossa')).toHaveLength(0)
  expect(planos('vitoria-regia')[0]?.detalhe).toContain('da água "lago"')
  expect(planos('folha-no-ar')).toHaveLength(0)
  // A peça fina com colisão não bloqueia a passagem: fica abaixo de 10 cm do piso.
  expect(de(avisos, 'piso-na-trilha')).toEqual(['quase-no-mesmo-plano'])
})

test('metadados do Arquipélago: Íris repetida, placa, física, tronco, fundação e postura', () => {
  const props = (p: Record<string, string | number | boolean>) => ({ propriedades: p })
  const avisos = conferirImplantacao(
    cena([
      objeto('iris-1', 'caixa', 0, 50, props({ 'arquipelago.ator': 'iris' })),
      objeto('iris-2', 'caixa', 10, 50, props({ 'arquipelago.ator': 'iris' })),
      objeto('iris-escondida', 'caixa', 15, 50, {
        oculto: true,
        ...props({ 'arquipelago.ator': 'iris' }),
      }),
      objeto('placa', 'caixa', 20, 50, props({ 'arquipelago.sinal.texto': 'Praia' })),
      objeto('fisica', 'caixa', 30, 50, props({ 'arquipelago.fisica': 'teleporte' })),
      objeto('raio', 'caixa', 40, 50, props({ 'arquipelago.raioDoTronco': 0 })),
      objeto(
        'fundacao',
        'caixa',
        50,
        50,
        props({
          'arquipelago.fundacao.min.x': -1,
          'arquipelago.fundacao.min.y': 0,
          'arquipelago.fundacao.min.z': -1,
          'arquipelago.fundacao.max.x': 1,
          'arquipelago.fundacao.max.y': 0,
          'arquipelago.fundacao.max.z': -2,
        }),
      ),
      objeto('torto', 'caixa', 60, 50, {
        ...props({ 'arquipelago.fisica': 'tronco' }),
        transformacao: {
          posicao: { x: 60, y: 0, z: 50 },
          rotacao: { x: 0.3, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 2 },
        },
        colisao: 'nenhuma',
      }),
    ]),
  )
  expect(de(avisos, 'iris-1')).toEqual(['ator-repetido'])
  expect(de(avisos, 'iris-2')).toEqual(['ator-repetido'])
  expect(de(avisos, 'iris-escondida')).toEqual([])
  expect(avisos.filter((a) => a.id === 'placa').map((a) => a.campo)).toEqual([
    'arquipelago.sinal.destino',
    'arquipelago.sinal.via.x',
    'arquipelago.sinal.via.z',
  ])
  expect(de(avisos, 'fisica')).toEqual(['fisica-invalida'])
  expect(de(avisos, 'raio')).toEqual(['raio-do-tronco-invalido'])
  const fundacao = avisos.filter((a) => a.id === 'fundacao')
  expect(fundacao.map((a) => [a.tipo, a.campo])).toEqual([
    ['fundacao-invalida', 'arquipelago.fundacao.max.y'],
    ['fundacao-invalida', 'arquipelago.fundacao.max.z'],
  ])
  expect(fundacao[0]?.detalhe).toContain('física')
  const postura = avisos.filter((a) => a.id === 'torto' && a.tipo === 'transformacao-do-papel')
  expect(postura.map((a) => a.mensagem)).toEqual([
    'Este objeto precisa ficar em pé, sem inclinar.',
    'O tronco precisa da mesma escala em x e em z.',
  ])
  // Primeiro o que impede o jogo de abrir.
  expect(avisos[0]?.tipo).toBe('ator-repetido')
})

test('cinco mil objetos, vinte trilhas e uma praça sobre relevo de verdade em bem menos de 1 s', () => {
  // A mesma peça repetida numa grade de 7 × 7 (448 m), com bordas iguais em todos os lados.
  const onda = (v: number) => Math.sin((2 * Math.PI * (((v % 64) + 64) % 64)) / 64)
  const amostras = Float64Array.from(
    { length: AMOSTRAS_DA_PECA },
    (_, i) => 20 + 2 * onda(i % 65) + 2 * onda(Math.floor(i / 65)),
  )
  const peca = lerPecaDeAlturas(codificarPecaDeAlturas(amostras, 0, 64))
  const base: BaseDeTerreno = {
    tipo: 'terreno',
    origem: { x: -224, z: -224 },
    passo: 1,
    colunas: 448,
    linhas: 448,
    min: 0,
    max: 64,
    fundo: 0,
    pecas: Array.from({ length: 49 }, (_, i) => ({
      coluna: i % 7,
      linha: Math.floor(i / 7),
      digest: 'e'.repeat(64),
    })),
  }
  const chao = leitorDoChao(base, new Map([['e'.repeat(64), peca]]))
  let semente = 7
  const sorteio = () => {
    semente = (semente * 16807) % 2147483647
    return semente / 2147483647
  }
  const instancias = Array.from({ length: 5000 }, (_, i) =>
    objeto(`o${i}`, i % 3 ? 'caixa' : 'arvore', sorteio() * 400 - 200, sorteio() * 400 - 200, {
      deslocamento: sorteio() - 0.5,
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: sorteio() * 6, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    }),
  )
  for (const o of instancias) {
    o.transformacao.posicao = { x: sorteio() * 400 - 200, y: 0, z: sorteio() * 400 - 200 }
    if (o.id.endsWith('7')) o.modelo = 'fina'
  }
  const caminhos: CaminhoDeCenario[] = Array.from({ length: 20 }, (_, i) => ({
    ...trilha(
      `t${i}`,
      Array.from({ length: 50 }, (_, k) => ({
        x: -200 + k * 8,
        z: -190 + i * 19 + 4 * Math.sin(k),
      })),
      2.5,
    ),
    suave: i % 2 === 0,
  }))
  caminhos.push({
    ...entidade('praca-grande'),
    tipo: 'praca',
    pontos: Array.from({ length: 64 }, (_, k) => ({
      x: 60 * Math.cos((k * Math.PI) / 32),
      z: 60 * Math.sin((k * Math.PI) / 32),
    })),
    largura: 1,
    acabamento: null,
  })
  const doc = cena(instancias, caminhos)
  doc.base = base
  const inicio = performance.now()
  const avisos = conferirImplantacao(doc, chao)
  const ms = performance.now() - inicio
  expect(avisos.length).toBeGreaterThan(100)
  const tipos = new Set(avisos.map((a) => a.tipo))
  for (const tipo of ['solido-no-caminho', 'flutuando', 'enterrado'] as const)
    expect(tipos.has(tipo)).toBe(true)
  expect(ms).toBeLessThan(1000)
})
