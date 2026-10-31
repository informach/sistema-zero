import { expect, test } from 'bun:test'
import {
  BIT_DO_FOSSIL,
  criarSalvamentoInicial,
  FOSSEIS_DO_VALE,
  migrarDaV21,
  migrarDaV22,
  migrarSalvamento,
  SalvamentoV21Schema,
  SalvamentoV23Schema,
  VERSAO_SALVAMENTO,
} from '../src/salvamento'
import { inicialV21 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-31T12:00:00Z')

test('a V21 migra para a V22 sem fóssil novo nem flor do céu, com o osso e a horta de antes', () => {
  const antiga = inicialV21(AGORA)
  antiga.vale.escavacao = 3
  antiga.horta[0] = { ...antiga.horta[0]!, semente: 'milho', plantadoEm: AGORA.toISOString() }
  const antes = structuredClone(antiga)
  expect(SalvamentoV21Schema.parse(antiga)).toEqual(antiga)
  const atual = migrarSalvamento(antiga)
  expect(atual).toEqual(migrarDaV22(migrarDaV21(antiga)))
  expect(atual?.versao).toBe(VERSAO_SALVAMENTO)
  expect(atual?.vale).toEqual({ ...antiga.vale, fosseis: 0 })
  expect(atual?.florada).toBe(0)
  expect(atual?.ceu).toEqual([])
  expect(atual?.horta).toEqual(antiga.horta)
  expect(antiga).toEqual(antes)
})

test('seis fósseis, um bit cada e estáveis; o jardim do céu tem seis canteiros, sem repetir', () => {
  expect(FOSSEIS_DO_VALE).toHaveLength(6)
  expect(Object.values(BIT_DO_FOSSIL)).toEqual([1, 2, 4, 8, 16, 32])
  const s = criarSalvamentoInicial(AGORA)
  const com = (fosseis: number) => ({ ...s, vale: { ...s.vale, fosseis } })
  expect(SalvamentoV23Schema.safeParse(com(63)).success).toBe(true)
  expect(SalvamentoV23Schema.safeParse(com(64)).success).toBe(false)
  expect(SalvamentoV23Schema.safeParse({ ...s, florada: 1000 }).success).toBe(false)
  const ceu = (l: unknown) => SalvamentoV23Schema.safeParse({ ...s, ceu: l }).success
  expect(
    ceu([
      [1, 2, 431_999],
      [6, 0, 0],
    ]),
  ).toBe(true)
  expect(
    ceu([
      [1, 2, 10],
      [1, 0, 20],
    ]),
  ).toBe(false)
  expect(ceu([[7, 0, 0]])).toBe(false)
  expect(ceu([[1, 3, 0]])).toBe(false)
  expect(SalvamentoV21Schema.safeParse({ ...inicialV21(AGORA), ceu: [] }).success).toBe(false)
  expect(migrarSalvamento({ ...s, versao: 24 })).toBeNull()
})
