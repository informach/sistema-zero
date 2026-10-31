import { expect, test } from 'bun:test'
import { BIT_DA_ILHA, ilhaVisitada } from '../src/exploracao'
import { ILHA_IDS } from '../src/ilhas'
import {
  migrarDaV17,
  migrarDaV18,
  migrarDaV19,
  migrarDaV20,
  migrarDaV21,
  migrarSalvamento,
  SALVAMENTO_MAX_BYTES,
  SalvamentoV17Schema,
  SalvamentoV18Schema,
  SalvamentoV22Schema,
} from '../src/salvamento'
import { inicialV17, inicialV18 } from './ajuda-salvamento'
import { cenariosDeSalvamentoCheio } from './cenario-salvamento-cheio'

const AGORA = new Date('2026-10-30T10:00:00Z')

test('V17 permanece estrita e migra sem presumir visitas nem alterar a entrada', () => {
  const antiga = inicialV17(AGORA)
  antiga.pontesVistas = [...ILHA_IDS]
  antiga.posicao = { x: 82, y: 2, z: 0 }
  const antes = structuredClone(antiga)
  expect(SalvamentoV17Schema.parse(antiga)).toEqual(antiga)
  expect(migrarSalvamento(antiga)).toEqual(
    migrarDaV21(
      migrarDaV20(migrarDaV19(migrarDaV18({ ...antiga, versao: 18, ilhasVisitadas: 0 }))),
    ),
  )
  expect(migrarSalvamento(antiga)).toEqual(
    migrarDaV21(migrarDaV20(migrarDaV19(migrarDaV18(migrarDaV17(antiga))))),
  )
  expect(antiga).toEqual(antes)
  expect(SalvamentoV17Schema.safeParse({ ...antiga, ilhasVisitadas: 0 }).success).toBe(false)
})

test('cada bit tem identidade própria e todas as 256 combinações atravessam JSON', () => {
  expect(BIT_DA_ILHA).toEqual({
    'sua-ilha': 1,
    bosque: 2,
    'vila-doce': 4,
    recife: 8,
    pico: 16,
    'vale-dos-dinos': 32,
    nuvens: 64,
    farol: 128,
  })
  const s = inicialV18(AGORA)
  for (let mask = 0; mask <= 255; mask++) {
    const salvo = { ...s, ilhasVisitadas: mask }
    expect(migrarSalvamento(JSON.parse(JSON.stringify(salvo)))).toEqual(
      migrarDaV21(migrarDaV20(migrarDaV19(migrarDaV18(salvo)))),
    )
    for (const id of ILHA_IDS) expect(ilhaVisitada(mask, id)).toBe(Boolean(mask & BIT_DA_ILHA[id]))
  }
  for (const valor of [-1, 256, 0.5, '1', null, undefined, NaN])
    expect(SalvamentoV18Schema.safeParse({ ...s, ilhasVisitadas: valor }).success).toBe(false)
  expect(migrarSalvamento({ ...s, versao: 23 })).toBeNull()
})

test('o cenário cheio com todas as visitas continua dentro de 64 KB UTF-8', () => {
  for (const s of cenariosDeSalvamentoCheio()) {
    const completo = { ...s, ilhasVisitadas: 255 }
    expect(SalvamentoV22Schema.safeParse(completo).success).toBe(true)
    expect(Buffer.byteLength(JSON.stringify(completo), 'utf8')).toBeLessThanOrEqual(
      SALVAMENTO_MAX_BYTES,
    )
  }
})
