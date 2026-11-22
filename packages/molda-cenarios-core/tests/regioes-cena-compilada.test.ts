import { describe, expect, test } from 'bun:test'
import {
  janelasDasRegioes,
  malhasDaMaiorJanela,
  malhasPorJanela,
  memoriaPorJanela,
} from '../src/compilar/janelas'
import { lerCenaCompilada } from '../src/compilar/schema'
import {
  calcularPertencaDasRegioes,
  conferirPertencaDasRegioes,
  type ItensDasRegioes,
} from '../src/compilar/schema-regioes'
import type { RegiaoDeCenario } from '../src/v2'

/**
 * As regiões na cena compilada (lote 5 da conclusão, 22/11/2026): cada região leva a lista do que
 * pertence a ela (nós, colisões e águas), decidida pela posição. O leitor confere a lista com a
 * MESMA função que o compilador usa, então lista velha ou incompleta é recusada antes de desenhar.
 */

const matriz = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const caixa = (x0: number, x1: number, z0 = -2, z1 = 2) => ({
  min: { x: x0, y: 0, z: z0 },
  max: { x: x1, y: 1, z: z1 },
})

const VILA: RegiaoDeCenario = {
  id: 'vila',
  nome: 'Vila',
  caixa: { x0: -20, z0: -10, x1: 0, z1: 10 },
  vizinhas: ['floresta'],
}
const FLORESTA: RegiaoDeCenario = {
  id: 'floresta',
  nome: 'Floresta',
  caixa: { x0: 0, z0: -10, x1: 20, z1: 10 },
  vizinhas: ['vila'],
}

function itens(): ItensDasRegioes {
  return {
    entidades: [
      { id: 'casa', propriedades: { uso: 'oficina' } },
      { id: 'pedra' },
      { id: 'lago' },
      { id: 'mar' },
      { id: 'banco', propriedades: {} },
    ],
    nos: [
      { id: 'n-vila', entidade: 'pedra', volume: caixa(-15, -10) },
      { id: 'n-borda', entidade: null, volume: caixa(-2, 2) },
      { id: 'n-ator', entidade: null, volume: caixa(-15, -14), preservarHierarquia: true },
      { id: 'n-casa', entidade: 'casa', volume: caixa(5, 6) },
      { id: 'n-fora', entidade: null, volume: caixa(50, 51) },
      { id: 'n-lago', entidade: 'lago', volume: caixa(8, 12), efeito: 'agua' },
      { id: 'n-mar', entidade: 'mar', volume: caixa(-20, 20), efeito: 'agua' },
      { id: 'n-banco', entidade: 'banco', volume: caixa(-5, -4) },
      // Encosta na borda da Floresta, sem entrar nela: só a Vila.
      { id: 'n-encosta', entidade: null, volume: caixa(-3, 0) },
      // Lotes do "Juntar peças": o que leva a casa (com propriedades) nas faixas é de todas.
      {
        id: 'lote-1',
        entidade: null,
        volume: caixa(3, 7),
        faixas: [{ entidade: 'pedra' }, { entidade: 'casa' }],
      },
      { id: 'lote-2', entidade: null, volume: caixa(3, 7), faixas: [{ entidade: 'pedra' }] },
    ],
    colisoes: [
      { id: 'piso', entidade: null, tipo: 'terreno', volume: caixa(-20, 20, -10, 10) },
      { id: 'c-floresta', entidade: null, tipo: 'caixa', volume: caixa(15, 16) },
      { id: 'c-relevo', entidade: null, tipo: 'terreno', volume: caixa(-20, 20, -10, 10) },
      { id: 'c-lago', entidade: 'lago', tipo: 'agua', volume: caixa(14, 15) },
      { id: 'c-casa', entidade: 'casa', tipo: 'caixa', volume: caixa(5, 6) },
    ],
    aguas: [
      { id: 'lago', tipo: 'lago' },
      { id: 'mar', tipo: 'mar' },
    ],
    plano: { colisao: 'piso' },
  }
}

describe('a pertença das regiões', () => {
  test('cada item vai às regiões que o volume dele toca, ou a nenhuma ("de todas")', () => {
    const [vila, floresta] = calcularPertencaDasRegioes([VILA, FLORESTA], itens())
    expect(vila).toEqual({
      ...VILA,
      nos: ['n-vila', 'n-borda', 'n-banco', 'n-encosta'],
      colisoes: [],
      aguas: [],
    })
    // O lago entra pela pegada da água inteira (o nó e a colisão dele), e os dois vão juntos.
    expect(floresta).toEqual({
      ...FLORESTA,
      nos: ['n-borda', 'n-lago', 'lote-2'],
      colisoes: ['c-floresta', 'c-lago'],
      aguas: ['lago'],
    })
  })

  test('o que é "de todas" não aparece em região nenhuma', () => {
    const regioes = calcularPertencaDasRegioes([VILA, FLORESTA], itens())
    const listados = new Set(regioes.flatMap((r) => [...r.nos, ...r.colisoes, ...r.aguas]))
    // Ator animado, ator com propriedades (o nó, a colisão e o lote que o leva), fora de toda
    // região, o mar, o piso plano e o relevo global.
    for (const id of [
      'n-ator',
      'n-casa',
      'c-casa',
      'lote-1',
      'n-fora',
      'n-mar',
      'mar',
      'piso',
      'c-relevo',
    ])
      expect(listados.has(id), id).toBe(false)
  })

  test('a mesma entrada dá a mesma saída, na ordem da cena', () => {
    expect(calcularPertencaDasRegioes([VILA, FLORESTA], itens())).toEqual(
      calcularPertencaDasRegioes([VILA, FLORESTA], itens()),
    )
  })

  test('a conferência recusa lista velha, incompleta ou com item que não existe', () => {
    const certas = calcularPertencaDasRegioes([VILA, FLORESTA], itens())
    expect(conferirPertencaDasRegioes({ ...itens(), regioes: certas })).toEqual([])
    const [vila, floresta] = certas as [(typeof certas)[0], (typeof certas)[0]]
    const casos = [
      [{ ...vila, nos: vila.nos.slice(1) }, floresta],
      [{ ...vila, nos: [...vila.nos, 'n-fora'] }, floresta],
      [vila, { ...floresta, colisoes: ['c-floresta'] }],
      [vila, { ...floresta, aguas: [] }],
      [{ ...vila, nos: [...vila.nos, 'n-sumiu'] }, floresta],
    ]
    for (const regioes of casos)
      expect(conferirPertencaDasRegioes({ ...itens(), regioes }).length).toBeGreaterThan(0)
  })

  test('a conferência também cobra nomes únicos, vizinhas em par e caixas sem sobreposição', () => {
    const regioes = (vila: RegiaoDeCenario, floresta: RegiaoDeCenario) =>
      calcularPertencaDasRegioes([vila, floresta], itens())
    for (const [vila, floresta] of [
      [VILA, { ...FLORESTA, nome: 'vila' }],
      [VILA, { ...FLORESTA, vizinhas: [] }],
      [VILA, { ...FLORESTA, caixa: { ...FLORESTA.caixa, x0: -1 } }],
    ] as const)
      expect(
        conferirPertencaDasRegioes({ ...itens(), regioes: regioes(vila, floresta) }),
      ).not.toEqual([])
  })
})

function cena() {
  const glb = (caminho: string, papel: string) => ({
    caminho,
    digest: 'b'.repeat(64),
    bytes: 100,
    mime: 'model/gltf-binary',
    papel,
    malhas: 1,
    triangulos: 1,
    verticesMaximos: 3,
  })
  return {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Vale',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'vale', revisao: 3, digest: 'a'.repeat(64) },
    arquivos: [glb('modelos/a.glb', 'modelo'), glb('colisoes/piso.glb', 'colisao')],
    entidades: [{ id: 'pedra', nome: 'Pedra', tipo: 'objeto', grupo: null }],
    nos: [
      {
        id: 'n0',
        entidade: 'pedra',
        arquivo: 'modelos/a.glb',
        matriz: [...matriz],
        volume: caixa(-15, -10),
      },
      {
        id: 'n1',
        entidade: null,
        arquivo: 'modelos/a.glb',
        matriz: [...matriz],
        volume: caixa(-2, 2),
      },
    ],
    colisoes: [
      {
        id: 'piso',
        entidade: null,
        tipo: 'terreno',
        arquivo: 'colisoes/piso.glb',
        matriz: [...matriz],
        volume: { min: { x: -20, y: 0, z: -10 }, max: { x: 20, y: 0, z: 10 } },
      },
    ],
    plano: { largura: 40, comprimento: 20, colisao: 'piso' },
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  }
}

describe('a cena compilada com regiões', () => {
  test('sem regiões fica como era', () => {
    expect(lerCenaCompilada(cena()).regioes).toBeUndefined()
  })

  test('com as listas certas, o leitor aceita', () => {
    const c = cena()
    const regioes = calcularPertencaDasRegioes([VILA, FLORESTA], { ...c, entidades: c.entidades })
    expect(regioes.map((r) => r.nos)).toEqual([['n0', 'n1'], ['n1']])
    expect(lerCenaCompilada({ ...c, regioes }).regioes).toEqual(regioes)
  })

  test('lista velha, campo desconhecido ou região fora da base é recusada', () => {
    const c = cena()
    const regioes = calcularPertencaDasRegioes([VILA, FLORESTA], { ...c, entidades: c.entidades })
    const [vila, floresta] = regioes as [(typeof regioes)[0], (typeof regioes)[0]]
    expect(() => lerCenaCompilada({ ...c, regioes: [{ ...vila, nos: ['n0'] }, floresta] })).toThrow(
      /região/i,
    )
    expect(() =>
      lerCenaCompilada({ ...c, regioes: [{ ...vila, cor: 'azul' }, floresta] }),
    ).toThrow()
    const longe = { ...VILA, caixa: { x0: -40, z0: -10, x1: -20, z1: 10 } }
    expect(() =>
      lerCenaCompilada({
        ...c,
        regioes: calcularPertencaDasRegioes([longe, FLORESTA], { ...c, entidades: c.entidades }),
      }),
    ).toThrow(/base/)
  })
})

describe('as janelas das regiões (o que fica carregado junto)', () => {
  // Três regiões em fila, A–B–C: a janela de A é A, B e o que é de todas; a de B é tudo.
  const r = (id: string, x0: number, vizinhas: string[]): RegiaoDeCenario => ({
    id,
    nome: id.toUpperCase(),
    caixa: { x0, z0: -10, x1: x0 + 10, z1: 10 },
    vizinhas,
  })
  const regioes = [r('a', 0, ['b']), r('b', 10, ['a', 'c']), r('c', 20, ['b'])]
  const itensDaFila: ItensDasRegioes = {
    entidades: [],
    nos: [
      { id: 'na', entidade: null, volume: caixa(2, 3) },
      { id: 'nb', entidade: null, volume: caixa(12, 13) },
      { id: 'nc', entidade: null, volume: caixa(22, 23) },
      { id: 'nc2', entidade: null, volume: caixa(24, 25) },
      { id: 'ator', entidade: null, volume: caixa(2, 3), preservarHierarquia: true },
    ],
    colisoes: [],
    aguas: [],
  }
  const cena = {
    ...itensDaFila,
    regioes: calcularPertencaDasRegioes(regioes, itensDaFila),
    nos: itensDaFila.nos.map((n) => ({ ...n, arquivo: n.id === 'nc2' ? 'grande.glb' : 'm.glb' })),
    colisoes: [],
    arquivos: [
      { caminho: 'm.glb', malhas: 2 },
      { caminho: 'grande.glb', malhas: 10 },
    ],
  }

  test('cada janela leva a região, as vizinhas e o que é de todas, na ordem da cena', () => {
    expect(janelasDasRegioes(cena).map((j) => [j.regiao, j.nos])).toEqual([
      ['a', ['na', 'nb', 'ator']],
      ['b', ['na', 'nb', 'nc', 'nc2', 'ator']],
      ['c', ['nb', 'nc', 'nc2', 'ator']],
    ])
  })

  test('as malhas que contam são as da maior janela', () => {
    // b: na 2 + nb 2 + nc 2 + nc2 10 + ator 2 = 18; a soma de tudo também é 18 aqui, então
    // a janela de A (6) prova que o total não é usado em cada uma.
    expect(malhasPorJanela(cena)).toEqual({ a: 6, b: 18, c: 16 })
    expect(malhasDaMaiorJanela(cena)).toBe(18)
    expect(malhasDaMaiorJanela({ ...cena, regioes: undefined })).toBe(18)
  })

  test('a memória de cada janela soma os arquivos dela e os que são de todas', () => {
    // m.glb é usado pelo ator (de todas): conta em todas as janelas, como o céu.
    const memoria = new Map([
      ['m.glb', 100],
      ['grande.glb', 1000],
      ['ceu.png', 5],
    ])
    expect(memoriaPorJanela(cena, memoria)).toEqual({ a: 105, b: 1105, c: 1105 })
    expect(memoriaPorJanela({ ...cena, regioes: undefined }, memoria)).toEqual({})
  })
})

test('a pegada da água é conferida uma vez por região, não uma vez por peça (revisão do lote 5)', () => {
  // Uma água com milhares de peças: refazer a pegada inteira para cada peça custava regiões ×
  // peças², e travava quem lê um manifesto grande.
  const pecas = Array.from({ length: 6000 }, (_, i) => ({
    id: `agua-${i}`,
    entidade: 'lago',
    volume: {
      min: { x: i % 100, y: 0, z: Math.floor(i / 100) },
      max: { x: (i % 100) + 1, y: 0, z: Math.floor(i / 100) + 1 },
    },
  }))
  const regioes = Array.from({ length: 8 }, (_, i) => ({
    id: `r${i}`,
    nome: `R${i}`,
    caixa: { x0: 200 + i * 10, z0: 0, x1: 210 + i * 10, z1: 10 },
    vizinhas: [],
  }))
  const inicio = performance.now()
  const listas = calcularPertencaDasRegioes(regioes, {
    entidades: [],
    nos: pecas,
    colisoes: [],
    aguas: [{ id: 'lago', tipo: 'lago' }],
  })
  expect(performance.now() - inicio).toBeLessThan(1000)
  expect(listas.every((r) => r.nos.length === 0 && r.aguas.length === 0)).toBe(true)
})
