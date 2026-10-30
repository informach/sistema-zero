import { expect, test } from 'bun:test'
import {
  LUMIS,
  migrarDaV7,
  migrarDaV8,
  migrarDaV9,
  migrarDaV10,
  migrarDaV11,
  migrarDaV12,
  migrarDaV13,
  migrarDaV14ParaAtual,
  migrarSalvamento,
  SALVAMENTO_MAX_BYTES,
  type SalvamentoV8,
  SalvamentoV8Schema,
  SalvamentoV9Schema,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')

/** Uma V8 com um turno feito na padaria. */
function v8(): SalvamentoV8 {
  const {
    versao: _,
    lumis: _l,
    rotinas: _r,
    recife: _recife,
    vale: _vale,
    pico: _pico,
    ...resto
  } = inicialV14(AGORA)
  return SalvamentoV8Schema.parse({
    ...resto,
    versao: 8,
    turnos: { padaria: { pagoEm: '2026-10-29', melhor: 3, vezes: 1 } },
  })
}

test('a V8 migra para a V9 sem perder nada, sem nenhum Lumi preso', () => {
  const antiga = v8()
  const clone = structuredClone(antiga)
  const nova = migrarDaV8(antiga)
  expect(nova).toEqual({ ...antiga, versao: 9, lumis: {} })
  expect(migrarSalvamento(antiga)).toEqual(
    migrarDaV14ParaAtual(migrarDaV13(migrarDaV12(migrarDaV11(migrarDaV10(migrarDaV9(nova)))))),
  )
  expect(SalvamentoV9Schema.parse(nova)).toEqual(nova)
  expect(antiga).toEqual(clone)
})

test('a V8 continua aceitando só o formato dela (sem os Lumis)', () => {
  expect(SalvamentoV8Schema.safeParse({ ...v8(), lumis: {} }).success).toBe(false)
  const {
    lumis: _,
    rotinas: _r,
    recife: _recife,
    vale: _vale,
    pico: _pico,
    ...semLumis
  } = inicialV14(AGORA)
  expect(migrarSalvamento({ ...semLumis, versao: 9 })).toBeNull()
})

test('a V9 guarda quantos Lumis de cada espécie ela prendeu, e recusa o que sai da régua', () => {
  const s = inicialV14(AGORA)
  expect(s.versao).toBe(14)
  expect(s.lumis).toEqual({})
  expect(LUMIS).toHaveLength(14)
  expect(new Set(LUMIS).size).toBe(14)
  const comLumis = { ...s, lumis: { quindim: 3, brigadeiro: 1 } }
  expect(migrarSalvamento(comLumis)).toEqual(migrarDaV14ParaAtual(comLumis))
  for (const errado of [{ quindim: 0 }, { quindim: 1000 }, { quindim: 1.5 }, { robo: 1 }])
    expect(migrarSalvamento({ ...s, lumis: errado })).toBeNull()
})

test('as versões antigas chegam até a V9', () => {
  const v7 = (() => {
    const { turnos: _, ...v } = v8()
    return { ...v, versao: 7 as const }
  })()
  expect(migrarSalvamento(v7)).toEqual(
    migrarDaV14ParaAtual(
      migrarDaV13(migrarDaV12(migrarDaV11(migrarDaV10(migrarDaV9(migrarDaV8(migrarDaV7(v7))))))),
    ),
  )
  expect(migrarSalvamento(v7)?.versao).toBe(19)
})

test('os 14 Lumis no máximo cabem no teto do salvamento', () => {
  const lumis = Object.fromEntries(LUMIS.map((id) => [id, 999]))
  const s = { ...inicialV14(AGORA), lumis }
  expect(migrarSalvamento(s)).toEqual(migrarDaV14ParaAtual(s))
  expect(JSON.stringify(s).length).toBeLessThan(SALVAMENTO_MAX_BYTES)
})
