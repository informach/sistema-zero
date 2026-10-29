import { expect, test } from 'bun:test'
import {
  MORADOR_NOVO,
  migrarDaV6,
  migrarDaV7,
  migrarDaV8,
  migrarDaV9,
  migrarDaV10,
  migrarDaV11,
  migrarDaV12,
  migrarDaV13,
  migrarDaV14,
  migrarSalvamento,
  SALVAMENTO_MAX_BYTES,
  type SalvamentoV6,
  SalvamentoV6Schema,
  SalvamentoV7Schema,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')

/** Uma V6 com a Capi já amiga, um bicho adotado e uma geladeira com aparência. */
function v6(): SalvamentoV6 {
  const {
    versao: _,
    moradores,
    turnos: _t,
    lumis: _l,
    rotinas: _r,
    recife: _recife,
    vale: _vale,
    pico: _pico,
    ...resto
  } = inicialV14(AGORA)
  return SalvamentoV6Schema.parse({
    ...resto,
    versao: 6,
    moradores: {
      capi: { ...moradores.capi, amizade: 240, conversaEm: '2026-10-28', presenteEm: '2026-10-28' },
    },
    inventario: { milho: 4, pipoca: 2 },
    projetos: {
      geladeira: {
        ganhoEm: AGORA.toISOString(),
        aparencia: { origem: 'pinta', id: 'c1' },
        aparencias: [{ origem: 'pinta', id: 'c1' }],
      },
    },
  })
}

test('a V6 migra para a V7 sem perder nada, com o Bento ainda sem conhecer a criança', () => {
  const antiga = v6()
  const clone = structuredClone(antiga)
  const nova = migrarDaV6(antiga)
  expect(nova).toEqual({
    ...antiga,
    versao: 7,
    moradores: { ...antiga.moradores, bento: MORADOR_NOVO },
  })
  expect(migrarSalvamento(antiga)).toEqual(
    migrarDaV14(
      migrarDaV13(migrarDaV12(migrarDaV11(migrarDaV10(migrarDaV9(migrarDaV8(migrarDaV7(nova))))))),
    ),
  )
  expect(SalvamentoV7Schema.parse(nova)).toEqual(nova)
  expect(antiga).toEqual(clone)
})

test('a V6 continua aceitando só o formato dela (sem o Bento)', () => {
  const antiga = v6()
  expect(SalvamentoV6Schema.safeParse(antiga).success).toBe(true)
  const comBento = { ...antiga, moradores: { ...antiga.moradores, bento: MORADOR_NOVO } }
  expect(SalvamentoV6Schema.safeParse(comBento).success).toBe(false)
})

test('a V7 guarda a amizade e o pedido do Bento e recusa o que sai da régua', () => {
  const s = migrarDaV6(v6())
  expect(s.versao).toBe(7)
  expect(s.moradores.bento).toEqual(MORADOR_NOVO)
  const amigo = {
    ...s,
    moradores: {
      ...s.moradores,
      bento: {
        amizade: 130,
        conversaEm: '2026-10-29',
        presenteEm: null,
        pedido: { dia: '2026-10-29', id: 'milho-2', entregue: false },
      },
    },
  }
  expect(migrarSalvamento(amigo)).toEqual(
    migrarDaV14(
      migrarDaV13(migrarDaV12(migrarDaV11(migrarDaV10(migrarDaV9(migrarDaV8(migrarDaV7(amigo))))))),
    ),
  )
  const bento = amigo.moradores.bento
  for (const errado of [
    { ...bento, amizade: 501 },
    { ...bento, amizade: -1 },
    { ...bento, presenteEm: '29/10/2026' },
    { ...bento, extra: true },
  ])
    expect(migrarSalvamento({ ...s, moradores: { ...s.moradores, bento: errado } })).toBeNull()
  const { bento: _, ...semBento } = s.moradores
  expect(migrarSalvamento({ ...s, moradores: semBento })).toBeNull()
})

test('o Bento cabe no teto do salvamento', () => {
  const s = inicialV14(AGORA)
  expect(JSON.stringify(s).length).toBeLessThan(SALVAMENTO_MAX_BYTES)
})
