import { expect, test } from 'bun:test'
import {
  CARTAS_LUMI,
  CASOS_DA_ESCOLHA,
  type CartaoDaRotina,
  CONDICOES_DA_ROTINA,
  contarCartoes,
  LIMITES_DA_ROTINA,
  LUGARES_DA_ROTINA,
  migrarDaV7,
  migrarDaV8,
  migrarDaV9,
  migrarSalvamento,
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
import { cenariosDeSalvamentoCheio } from './cenario-salvamento-cheio'

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

test('construção e rotinas no teto com IDs canônicos cabem nos 64 KB', () => {
  let maior = 0
  for (const s of cenariosDeSalvamentoCheio()) {
    expect(migrarSalvamento(s)).not.toBeNull()
    maior = Math.max(maior, new TextEncoder().encode(JSON.stringify(s)).byteLength)
  }
  expect(maior).toBeLessThan(SALVAMENTO_MAX_BYTES)
  // V17 inclui seis moradores com pedidos de 40 caracteres UTF-8: 62.605 bytes neste cenário.
  expect(SALVAMENTO_MAX_BYTES - maior).toBeGreaterThan(2800)
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
