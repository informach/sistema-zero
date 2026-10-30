import { expect, test } from 'bun:test'
import {
  migrarDaV6,
  migrarDaV7,
  migrarDaV8,
  migrarDaV9,
  migrarDaV10,
  migrarDaV11,
  migrarDaV12,
  migrarDaV13,
  migrarDaV14ParaAtual,
  migrarSalvamento,
  POSTOS_DA_VILA,
  SALVAMENTO_MAX_BYTES,
  type SalvamentoV7,
  SalvamentoV7Schema,
  SalvamentoV8Schema,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')

/** Uma V7 com o Bento já amigo e um pouco de inventário. */
function v7(): SalvamentoV7 {
  const {
    versao: _,
    turnos: _t,
    lumis: _l,
    rotinas: _r,
    recife: _recife,
    vale: _vale,
    pico: _pico,
    ...resto
  } = inicialV14(AGORA)
  return SalvamentoV7Schema.parse({
    ...resto,
    versao: 7,
    moradores: {
      ...resto.moradores,
      bento: { amizade: 120, conversaEm: '2026-10-28', presenteEm: null, pedido: null },
    },
    inventario: { fuba: 1, leite: 2 },
  })
}

test('a V7 migra para a V8 sem perder nada, sem nenhum turno feito', () => {
  const antiga = v7()
  const clone = structuredClone(antiga)
  const nova = migrarDaV7(antiga)
  expect(nova).toEqual({ ...antiga, versao: 8, turnos: {} })
  expect(migrarSalvamento(antiga)).toEqual(
    migrarDaV14ParaAtual(
      migrarDaV13(migrarDaV12(migrarDaV11(migrarDaV10(migrarDaV9(migrarDaV8(nova)))))),
    ),
  )
  expect(SalvamentoV8Schema.parse(nova)).toEqual(nova)
  expect(antiga).toEqual(clone)
})

test('a V7 continua aceitando só o formato dela (sem os turnos)', () => {
  const antiga = v7()
  expect(SalvamentoV7Schema.safeParse({ ...antiga, turnos: {} }).success).toBe(false)
  const {
    turnos: _,
    lumis: _l,
    rotinas: _r,
    recife: _recife,
    vale: _vale,
    pico: _pico,
    ...semTurnos
  } = inicialV14(AGORA)
  expect(migrarSalvamento({ ...semTurnos, versao: 8 })).toBeNull()
})

test('a V8 guarda o turno de cada balcão e recusa o que sai da régua', () => {
  const s = inicialV14(AGORA)
  expect(s.versao).toBe(14)
  expect(s.turnos).toEqual({})
  expect(POSTOS_DA_VILA).toEqual(['padaria', 'sorveteria', 'sucos'])
  const turno = { pagoEm: '2026-10-29', melhor: 3, vezes: 2 }
  const comTurnos = { ...s, turnos: { padaria: turno, sucos: { ...turno, pagoEm: null } } }
  expect(migrarSalvamento(comTurnos)).toEqual(migrarDaV14ParaAtual(comTurnos))
  for (const errado of [
    { ...turno, melhor: 0 },
    { ...turno, melhor: 4 },
    { ...turno, vezes: 0 },
    { ...turno, pagoEm: '29/10/2026' },
    { ...turno, extra: true },
  ])
    expect(migrarSalvamento({ ...s, turnos: { padaria: errado } })).toBeNull()
  expect(migrarSalvamento({ ...s, turnos: { feira: turno } })).toBeNull()
})

test('as versões antigas chegam até a V8', () => {
  const v6 = (() => {
    const { moradores, ...v } = v7()
    return { ...v, versao: 6 as const, moradores: { capi: moradores.capi } }
  })()
  expect(migrarSalvamento(v6)).toEqual(
    migrarDaV14ParaAtual(
      migrarDaV13(
        migrarDaV12(migrarDaV11(migrarDaV10(migrarDaV9(migrarDaV8(migrarDaV7(migrarDaV6(v6))))))),
      ),
    ),
  )
  expect(migrarSalvamento(v6)?.versao).toBe(19)
})

test('os três turnos cabem no teto do salvamento', () => {
  const turno = { pagoEm: '2026-10-29', melhor: 3, vezes: 9999 }
  const s = {
    ...inicialV14(AGORA),
    turnos: { padaria: turno, sorveteria: turno, sucos: turno },
  }
  expect(JSON.stringify(s).length).toBeLessThan(SALVAMENTO_MAX_BYTES)
})

test('a entrega pelos telhados entra nos percursos sem versão nova', () => {
  const resultado = {
    estrelas: { chegada: true, tempo: false, vagalumes: true },
    melhorTempoMs: 18_400,
  }
  const s = { ...inicialV14(AGORA), percursos: { 'vila-telhados': resultado } }
  expect(migrarSalvamento(s)).toEqual(migrarDaV14ParaAtual(s))
  expect(migrarSalvamento({ ...s, percursos: { 'vila-praca': resultado } })).toBeNull()
})
