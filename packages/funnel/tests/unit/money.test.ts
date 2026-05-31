import { describe, expect, test } from 'bun:test'
import { formatBRLFromCents, parseNonNegativeInt, parseReaisToCents } from '../../src/lib/money'

describe('parseReaisToCents', () => {
  test('formato pt-BR (vírgula decimal, ponto milhar)', () => {
    expect(parseReaisToCents('1.234,50')).toBe(123450)
    expect(parseReaisToCents('2000')).toBe(200000)
    expect(parseReaisToCents('R$ 37,00')).toBe(3700)
    expect(parseReaisToCents('50,5')).toBe(5050)
  })

  test('ponto como decimal não é lido como milhar (evita erro de 100x)', () => {
    expect(parseReaisToCents('50.00')).toBe(5000) // R$ 50,00 — não R$ 5.000
    expect(parseReaisToCents('1.5')).toBe(150) // R$ 1,50
    expect(parseReaisToCents('1234.56')).toBe(123456) // R$ 1.234,56
  })

  test('ponto como milhar (grupo final de 3 dígitos ou múltiplos pontos)', () => {
    expect(parseReaisToCents('1.234')).toBe(123400) // R$ 1.234
    expect(parseReaisToCents('1.000')).toBe(100000) // R$ 1.000
    expect(parseReaisToCents('1.234.567')).toBe(123456700)
  })

  test('inválidos → null', () => {
    expect(parseReaisToCents('')).toBeNull()
    expect(parseReaisToCents('abc')).toBeNull()
    expect(parseReaisToCents('-5')).toBeNull()
  })
})

describe('parseNonNegativeInt', () => {
  test('inteiros válidos', () => {
    expect(parseNonNegativeInt('10')).toBe(10)
    expect(parseNonNegativeInt('0')).toBe(0)
  })
  test('rejeita decimais e negativos', () => {
    expect(parseNonNegativeInt('10.5')).toBeNull()
    expect(parseNonNegativeInt('-3')).toBeNull()
    expect(parseNonNegativeInt('x')).toBeNull()
  })
})

describe('formatBRLFromCents', () => {
  test('formata em R$ sem casas', () => {
    expect(formatBRLFromCents(400000)).toContain('4.000')
  })
})
