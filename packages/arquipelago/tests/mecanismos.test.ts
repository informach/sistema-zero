import { expect, test } from 'bun:test'
import { alvoDoAlcapao, caixaNaPlaca } from '../src/sistemas/mecanismos'

test('o caixote precisa estar apoiado na placa, não só passar por cima', () => {
  expect(caixaNaPlaca(0, 0.39, 0, 0, 0, 0)).toBe(true)
  expect(caixaNaPlaca(0, 2, 0, 0, 0, 0)).toBe(false)
  expect(caixaNaPlaca(0.7, 0.39, 0, 0, 0, 0)).toBe(false)
  expect(caixaNaPlaca(0, 0.39, 0.7, 0, 0, 0)).toBe(false)
  expect(alvoDoAlcapao(true)).toBeGreaterThan(1)
  expect(alvoDoAlcapao(false)).toBe(0)
})
