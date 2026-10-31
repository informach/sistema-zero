import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  MORADOR_NOVO,
  migrarDaV20,
  migrarSalvamento,
  SalvamentoV20Schema,
  SalvamentoV21Schema,
  VERSAO_SALVAMENTO,
} from '../src/salvamento'
import { inicialV20 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-31T12:00:00Z')

test('a V20 migra para a V21 com o Nico sem amizade e a mesma companhia (A19, A7)', () => {
  const antiga = { ...inicialV20(AGORA), companhia: 'adotado' as const }
  const antes = structuredClone(antiga)
  expect(SalvamentoV20Schema.parse(antiga)).toEqual(antiga)
  const atual = migrarSalvamento(antiga)
  expect(atual).toEqual(migrarDaV20(antiga))
  expect(atual?.versao).toBe(VERSAO_SALVAMENTO)
  expect(atual?.moradores.nico).toEqual(MORADOR_NOVO)
  expect(atual?.moradores.capi).toEqual(antiga.moradores.capi)
  expect(atual?.companhia).toBe('adotado')
  expect(antiga).toEqual(antes)
})

test('o filhote do Vale só é companhia da V21 em diante; o Nico é estrito como os outros', () => {
  const s = criarSalvamentoInicial(AGORA)
  expect(SalvamentoV21Schema.safeParse({ ...s, companhia: 'filhote' }).success).toBe(true)
  expect(
    SalvamentoV20Schema.safeParse({ ...inicialV20(AGORA), companhia: 'filhote' }).success,
  ).toBe(false)
  expect(SalvamentoV21Schema.safeParse({ ...s, companhia: 'dino' }).success).toBe(false)
  const amizade = (n: number) => ({
    ...s,
    moradores: { ...s.moradores, nico: { ...s.moradores.nico, amizade: n } },
  })
  expect(SalvamentoV21Schema.safeParse(amizade(500)).success).toBe(true)
  expect(SalvamentoV21Schema.safeParse(amizade(501)).success).toBe(false)
  const { nico: _nico, ...semNico } = s.moradores
  expect(SalvamentoV21Schema.safeParse({ ...s, moradores: semNico }).success).toBe(false)
  expect(migrarSalvamento({ ...s, versao: 22 })).toBeNull()
})
