import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  migrarDaV10,
  migrarDaV11,
  migrarDaV12,
  migrarDaV13,
  migrarSalvamento,
  SalvamentoV10Schema,
  SalvamentoV11Schema,
} from '../src/salvamento'

test('V10 continua estrita e migra sem modificar o documento antigo', () => {
  const {
    recife: _,
    vale: _vale,
    pico: _pico,
    ...base
  } = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
  const v10 = SalvamentoV10Schema.parse({ ...base, versao: 10, inventario: { milho: 11 } })
  const antes = structuredClone(v10)
  const atual = migrarDaV10(v10)
  expect(atual).toEqual({
    ...v10,
    versao: 11,
    recife: { bau: false, pagina: false, tesouro: false },
  })
  expect(migrarSalvamento(v10)).toEqual(migrarDaV13(migrarDaV12(migrarDaV11(atual))))
  expect(v10).toEqual(antes)
  expect(SalvamentoV10Schema.safeParse({ ...v10, recife: atual.recife }).success).toBe(false)
})
test('as três descobertas sobrevivem ao JSON, sem aceitar marcas inválidas nem versão futura', () => {
  const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
  const { vale: _vale, pico: _pico, ...base } = s
  const v11 = {
    ...base,
    versao: 11 as const,
    recife: { bau: false, pagina: false, tesouro: false },
  }
  for (let bits = 0; bits < 8; bits++) {
    const recife = { bau: !!(bits & 1), pagina: !!(bits & 2), tesouro: !!(bits & 4) }
    expect(migrarSalvamento(JSON.parse(JSON.stringify({ ...v11, recife })))).toEqual({
      ...s,
      recife: { ...recife, corais: 0 },
    })
  }
  for (const recife of [null, {}, { ...s.recife, bau: 1 }, { ...s.recife, outro: false }])
    expect(SalvamentoV11Schema.safeParse({ ...v11, recife }).success).toBe(false)
  expect(migrarSalvamento({ ...s, versao: 15 })).toBeNull()
  expect(
    migrarSalvamento({ ...s, rotinas: { quindim: [{ c: 'quando-amanhecer' }, { c: 'regar' }] } }),
  ).toBeNull()
})
