import { expect, test } from 'bun:test'
import {
  APARENCIAS_GUARDADAS_MAXIMO,
  CARTAS_LUMI,
  CASOS_DA_ESCOLHA,
  type CartaoDaRotina,
  CONDICOES_DA_ROTINA,
  contarCartoes,
  criarSalvamentoInicial,
  DIAS_CUIDADOS_MAXIMO,
  DIAS_PARA_CHOCAR,
  ID_DA_APARENCIA_MAXIMO,
  LIMITES_DA_ROTINA,
  LUGARES_DA_ROTINA,
  LUMIS,
  type LumiId,
  migrarDaV7,
  migrarDaV8,
  migrarDaV9,
  migrarSalvamento,
  OBJETOS_DA_CASA,
  type Obra,
  PERCURSOS,
  POSTOS_DA_VILA,
  profundidadeDaRotina,
  SALVAMENTO_MAX_BYTES,
  type SalvamentoV9,
  SalvamentoV9Schema,
  SalvamentoV10Schema,
} from '../src'
import {
  migrarDaV10,
  migrarDaV11,
  migrarDaV12,
  migrarDaV13,
  migrarDaV14ParaAtual,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')

/** Uma V9 com dois Lumis presos. */
function v9(): SalvamentoV9 {
  const {
    versao: _,
    rotinas: _r,
    recife: _recife,
    vale: _vale,
    pico: _pico,
    ...resto
  } = inicialV14(AGORA)
  return SalvamentoV9Schema.parse({ ...resto, versao: 9, lumis: { quindim: 2, brigadeiro: 1 } })
}

/** A rotina do exemplo da proposta ("Rotina da Pitanga"), com os cartões de hoje. */
const ROTINA_DO_EXEMPLO: CartaoDaRotina[] = [
  { c: 'quando-amanhecer' },
  { c: 'voar-ate', a: 'horta' },
  { c: 'para-cada', d: [{ c: 'regar' }, { c: 'se', se: 'maduro', d: [{ c: 'colher' }] }] },
  { c: 'voar-ate', a: 'geladeira' },
  { c: 'guardar' },
]

const com = (rotinas: object, lumis: object = { quindim: 2, brigadeiro: 1 }) =>
  migrarSalvamento({ ...inicialV14(AGORA), lumis, rotinas })

test('a V9 migra para a V10 sem perder nada, sem nenhuma rotina', () => {
  const antiga = v9()
  const clone = structuredClone(antiga)
  const nova = migrarDaV9(antiga)
  expect(nova).toEqual({ ...antiga, versao: 10, rotinas: {} })
  expect(migrarSalvamento(antiga)).toEqual(
    migrarDaV14ParaAtual(migrarDaV13(migrarDaV12(migrarDaV11(migrarDaV10(nova))))),
  )
  expect(SalvamentoV10Schema.parse(nova)).toEqual(nova)
  expect(antiga).toEqual(clone)
  expect(inicialV14(AGORA)).toMatchObject({ versao: 14, rotinas: {} })
})

test('a V9 continua aceitando só o formato dela, e as antigas chegam até a V10', () => {
  expect(SalvamentoV9Schema.safeParse({ ...v9(), rotinas: {} }).success).toBe(false)
  const { rotinas: _, recife: _recife, vale: _vale, pico: _pico, ...semRotinas } = inicialV14(AGORA)
  expect(migrarSalvamento({ ...semRotinas, versao: 10 })).toBeNull()
  const v7 = (() => {
    const { turnos: _t, lumis: _l, ...v } = v9()
    return { ...v, versao: 7 as const }
  })()
  expect(migrarSalvamento(v7)).toEqual(
    migrarDaV14ParaAtual(
      migrarDaV13(migrarDaV12(migrarDaV11(migrarDaV10(migrarDaV9(migrarDaV8(migrarDaV7(v7))))))),
    ),
  )
  expect(migrarSalvamento({ ...inicialV14(AGORA), versao: 15 })).toBeNull()
})

test('guarda a rotina de um Lumi preso, e só de Lumi preso', () => {
  expect(com({ quindim: ROTINA_DO_EXEMPLO })?.rotinas.quindim).toEqual(ROTINA_DO_EXEMPLO)
  expect(com({ pitanga: ROTINA_DO_EXEMPLO })).toBeNull()
  expect(com({ robo: ROTINA_DO_EXEMPLO })).toBeNull()
})

test('os cartões são os do caderno, e os parâmetros ficam na régua', () => {
  const ids = new Set(CARTAS_LUMI.map((c) => c.id))
  const usados: CartaoDaRotina['c'][] = [
    'quando-amanhecer',
    'quando-anoitecer',
    'voar-ate',
    'regar',
    'colher',
    'guardar',
    'repetir',
    'para-cada',
    'enquanto',
    'se',
    'escolha',
    'esperar',
    'guardar-na-memoria',
    'contar',
  ]
  expect(new Set<string>(usados)).toEqual(ids)
  const q = { c: 'quando-anoitecer' }
  const vale = (c: object) => com({ quindim: [q, c] }) !== null
  expect(vale({ c: 'voar-ate', a: 'horta' })).toBe(true)
  expect(vale({ c: 'voar-ate', a: 'farol' })).toBe(false)
  expect(vale({ c: 'repetir', n: 2, d: [{ c: 'regar' }] })).toBe(true)
  expect(vale({ c: 'repetir', n: 1, d: [{ c: 'regar' }] })).toBe(false)
  expect(vale({ c: 'repetir', n: 10, d: [{ c: 'regar' }] })).toBe(false)
  expect(vale({ c: 'repetir', n: 3, d: [] })).toBe(false)
  expect(vale({ c: 'se', se: 'maduro', d: [{ c: 'colher' }] })).toBe(true)
  expect(vale({ c: 'se', se: 'maduro', n: 3, d: [{ c: 'colher' }] })).toBe(false)
  expect(vale({ c: 'enquanto', se: 'lembra-menos-que', n: 3, d: [{ c: 'contar' }] })).toBe(true)
  expect(vale({ c: 'enquanto', se: 'lembra-menos-que', d: [{ c: 'contar' }] })).toBe(false)
  expect(vale({ c: 'escolha', casos: { maduro: [{ c: 'colher' }] } })).toBe(true)
  expect(vale({ c: 'escolha', casos: {} })).toBe(false)
  expect(vale({ c: 'escolha', casos: { murcho: [{ c: 'colher' }] } })).toBe(false)
  expect(vale({ c: 'esperar', n: 10 })).toBe(true)
  expect(vale({ c: 'esperar', n: 11 })).toBe(false)
  expect(vale({ c: 'guardar-na-memoria', n: 0 })).toBe(true)
  expect(vale({ c: 'guardar-na-memoria', n: 100 })).toBe(false)
  expect(vale({ c: 'regar', extra: 1 })).toBe(false)
  expect(vale({ c: 'voar' })).toBe(false)
})

test('começa com um QUANDO, e só ele é QUANDO', () => {
  expect(com({ quindim: [{ c: 'regar' }, { c: 'colher' }] })).toBeNull()
  expect(com({ quindim: [{ c: 'quando-amanhecer' }] })).toBeNull()
  expect(
    com({ quindim: [{ c: 'quando-amanhecer' }, { c: 'quando-anoitecer' }, { c: 'regar' }] }),
  ).toBeNull()
  expect(
    com({
      quindim: [
        { c: 'quando-amanhecer' },
        { c: 'se', se: 'maduro', d: [{ c: 'quando-amanhecer' }] },
      ],
    }),
  ).toBeNull()
})

test('os tetos: profundidade, cartões numa rotina e somando as rotinas', () => {
  const L = LIMITES_DA_ROTINA
  const aninhado = (n: number): CartaoDaRotina =>
    n === 0 ? { c: 'regar' } : { c: 'repetir', n: 2, d: [aninhado(n - 1)] }
  const fundo = (n: number) => [{ c: 'quando-amanhecer' as const }, aninhado(n)]
  expect(profundidadeDaRotina(fundo(L.profundidade))).toBe(L.profundidade)
  expect(com({ quindim: fundo(L.profundidade) })).not.toBeNull()
  expect(com({ quindim: fundo(L.profundidade + 1) })).toBeNull()
  const comprida = (n: number): CartaoDaRotina[] => [
    { c: 'quando-amanhecer' },
    ...Array.from({ length: n - 1 }, () => ({ c: 'regar' as const })),
  ]
  expect(com({ quindim: comprida(L.cartoesPorRotina) })).not.toBeNull()
  expect(com({ quindim: comprida(L.cartoesPorRotina + 1) })).toBeNull()
  // Somando as rotinas: duas cheias cabem; com uma terceira, passa do teto.
  const tres = { quindim: 1, brigadeiro: 1, pitanga: 1 }
  const cheias = { quindim: comprida(16), brigadeiro: comprida(16) }
  expect(contarCartoes(cheias.quindim) * 2).toBe(L.cartoesNasRotinas)
  expect(com(cheias, tres)).not.toBeNull()
  expect(com({ ...cheias, pitanga: comprida(2) }, tres)).toBeNull()
})

/** O cartão mais pesado em bytes de cada tipo, com os de dentro no nível de baixo. */
function pesado(nivel: number): CartaoDaRotina {
  const folha: CartaoDaRotina = { c: 'guardar-na-memoria', n: LIMITES_DA_ROTINA.memoria.max }
  if (nivel === 0) return folha
  return { c: 'enquanto', se: 'lembra-menos-que', n: 99, d: [pesado(nivel - 1)] }
}

/** Uma rotina pesada com exatamente `n` cartões (o QUANDO e cadeias de enquanto até o fundo). */
function rotinaPesada(n: number): CartaoDaRotina[] {
  const lista: CartaoDaRotina[] = [{ c: 'quando-anoitecer' }]
  let falta = n - 1
  while (falta > 0) {
    const nivel = Math.min(LIMITES_DA_ROTINA.profundidade, falta - 1)
    lista.push(pesado(nivel))
    falta -= nivel + 1
  }
  return lista
}

test('construção e rotinas no teto com IDs canônicos cabem nos 64 KB', () => {
  const ponto = (i: number) => ({ x: -60 + (i % 60), z: -60 + Math.floor(i / 60) })
  const trecho = (i: number) => ({ ...ponto(i), eixo: 'x' as const, n: 60 })
  const cheia = (): Obra => ({
    paredes: Array.from({ length: 200 }, (_, i) => trecho(i)),
    aberturas: Array.from({ length: 60 }, (_, i) => ({
      ...ponto(i),
      eixo: 'z' as const,
      tipo: 'janela-redonda' as const,
    })),
    pisos: Array.from({ length: 30 }, (_, i) => ({ ...ponto(i), tipo: 'azulejo' as const })),
    objetos: OBJETOS_DA_CASA.map((id, i) => ({ id, ...ponto(i), giro: 3 })),
    cercas: Array.from({ length: 120 }, (_, i) => trecho(i)),
    caminhos: Array.from({ length: 240 }, (_, i) => ({ ...ponto(i), tipo: 'grama' as const })),
    canteiros: Array.from({ length: 18 }, (_, i) => ponto(i)),
  })
  const aparencias = Array.from({ length: APARENCIAS_GUARDADAS_MAXIMO }, (_, i) => ({
    origem: 'criacao' as const,
    id: `${i}`.padStart(ID_DA_APARENCIA_MAXIMO, 'x'),
  }))
  const projeto = { ganhoEm: AGORA.toISOString(), aparencia: aparencias[0], aparencias }
  const turno = { pagoEm: '2026-10-29', melhor: 3, vezes: 9999 }
  const percurso = {
    estrelas: { chegada: true, tempo: true, vagalumes: true },
    melhorTempoMs: 3_599_999,
  }
  // O filhote do Vale mais pesado (V15): nome de 16 letras, as três datas e dois dígitos nos dias.
  const filhote = {
    ovo: DIAS_PARA_CHOCAR,
    aquecidoEm: '2026-10-29',
    nome: 'x'.repeat(16),
    comeuEm: '2026-10-29',
    carinhoEm: '2026-10-29',
    dias: DIAS_CUIDADOS_MAXIMO,
  }
  const base = {
    ...criarSalvamentoInicial(AGORA),
    nuvens: { constelacoes: 63 },
    clima: 'nublado' as const,
    // Os três ids pesam mais que a lista vazia. false ocupa um byte a mais que true.
    vale: { pegadas: false, escavacao: 3, ninhos: ['ninho-1', 'ninho-2', 'ninho-3'], filhote },
    construcao: { casa: cheia(), cabanas: { bosque: cheia() } },
    projetos: Object.fromEntries(OBJETOS_DA_CASA.map((id) => [id, projeto])),
    turnos: Object.fromEntries(POSTOS_DA_VILA.map((p) => [p, turno])),
    percursos: Object.fromEntries(PERCURSOS.map((p) => [p, percurso])),
    lumis: Object.fromEntries(LUMIS.map((id) => [id, 999])),
  }
  const L = LIMITES_DA_ROTINA
  // Os jeitos de gastar o teto somando as rotinas: poucas rotinas cheias ou muitas curtas.
  const porRotina = (quantas: number): Partial<Record<LumiId, CartaoDaRotina[]>> => {
    const cada = Math.floor(L.cartoesNasRotinas / quantas)
    const ids = [...LUMIS].sort((a, b) => b.length - a.length).slice(0, quantas)
    return Object.fromEntries(
      ids.map((id) => [id, rotinaPesada(Math.min(cada, L.cartoesPorRotina))]),
    )
  }
  let maior = 0
  for (let quantas = 2; quantas <= LUMIS.length; quantas++) {
    const rotinas = porRotina(quantas)
    // O Recife mais pesado: false ocupa um byte a mais que true, e os corais têm dois dígitos.
    const recife = { bau: false, pagina: false, tesouro: false, corais: 15 }
    const s = { ...base, rotinas, recife }
    expect(migrarSalvamento(s)).not.toBeNull()
    maior = Math.max(maior, new TextEncoder().encode(JSON.stringify(s)).byteLength)
  }
  expect(maior).toBeLessThan(SALVAMENTO_MAX_BYTES)
  // Com IDs canônicos de até 40 caracteres, inclusive o progresso V16, permanece esta margem.
  expect(SALVAMENTO_MAX_BYTES - maior).toBeGreaterThan(4000)
})

test('as listas da régua não mudam sem querer', () => {
  expect(LUGARES_DA_ROTINA).toEqual(['horta', 'geladeira'])
  expect(CONDICOES_DA_ROTINA).toEqual([
    'maduro',
    'precisa-de-agua',
    'carregando',
    'lembra-menos-que',
  ])
  expect(CASOS_DA_ESCOLHA).toEqual(['vazio', 'precisa-de-agua', 'crescendo', 'maduro'])
})
