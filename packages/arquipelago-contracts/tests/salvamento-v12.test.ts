import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  migrarDaV11,
  migrarDaV12,
  migrarDaV13,
  migrarDaV14,
  migrarSalvamento,
  NINHOS_DO_VALE,
  SalvamentoV11Schema,
  SalvamentoV12Schema,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

test('V11 migra para V12 sem alterar suas conquistas, rotina ou documento original', () => {
  const { vale: _, pico: _pico, ...base } = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
  const antiga = SalvamentoV11Schema.parse({
    ...base,
    versao: 11,
    recife: { bau: true, pagina: true, tesouro: true },
    lumis: { quindim: 1 },
    rotinas: { quindim: [{ c: 'quando-amanhecer' }, { c: 'regar' }] },
  })
  const copia = structuredClone(antiga)
  const atual = migrarDaV11(antiga)
  expect(atual).toEqual({
    ...antiga,
    versao: 12,
    vale: { pegadas: false, escavacao: 0, ninhos: [] },
  })
  expect(migrarSalvamento(antiga)).toEqual(migrarDaV14(migrarDaV13(migrarDaV12(atual))))
  expect(antiga).toEqual(copia)
  expect(SalvamentoV11Schema.safeParse({ ...antiga, vale: atual.vale }).success).toBe(false)
})

test('V12 conserva cada etapa pelo JSON e recusa progresso impossível, duplicado ou futuro', () => {
  const base = inicialV14(new Date('2026-10-29T12:00:00Z'))
  for (let etapa = 0; etapa <= 3; etapa++)
    for (let bits = 0; bits < 8; bits++) {
      const s = {
        ...base,
        vale: {
          pegadas: true,
          escavacao: etapa,
          ninhos: NINHOS_DO_VALE.filter((_, i) => bits & (1 << i)),
        },
      }
      expect(migrarSalvamento(JSON.parse(JSON.stringify(s)))).toEqual(migrarDaV14(s))
    }
  for (const vale of [
    null,
    {},
    { ...base.vale, outro: true },
    { ...base.vale, escavacao: 4 },
    { ...base.vale, escavacao: -1 },
    { ...base.vale, escavacao: 1.5 },
    { ...base.vale, pegadas: 1 },
    { ...base.vale, ninhos: ['ninho-1', 'ninho-1'] },
    { ...base.vale, ninhos: ['ninho-4'] },
  ])
    expect(SalvamentoV12Schema.safeParse({ ...base, vale }).success).toBe(false)
  expect(migrarSalvamento({ ...base, versao: 15 })).toBeNull()
  expect(
    migrarSalvamento({
      ...base,
      rotinas: { quindim: [{ c: 'quando-amanhecer' }, { c: 'regar' }] },
    }),
  ).toBeNull()
})
