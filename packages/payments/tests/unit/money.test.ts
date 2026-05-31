import { describe, expect, test } from 'bun:test'
import { ValidationError } from '../../src/domain/shared/errors'
import { Money } from '../../src/domain/value-objects/money'

describe('Money', () => {
  test('cria a partir de reais convertendo para centavos', () => {
    const money = Money.fromReais(10.99)
    expect(money.amountInCents).toBe(1099n)
    expect(money.currency).toBe('BRL')
    expect(money.toReais()).toBe(10.99)
  })

  test('cria a partir de centavos', () => {
    expect(Money.fromCents(2500).amountInCents).toBe(2500n)
    expect(Money.fromCents(2500n).amountInCents).toBe(2500n)
  })

  test('soma valores da mesma moeda', () => {
    const total = Money.fromCents(1000).add(Money.fromCents(500))
    expect(total.amountInCents).toBe(1500n)
  })

  test('rejeita valores negativos', () => {
    expect(() => Money.fromCents(-1)).toThrow(ValidationError)
  })

  test('igualdade é por valor', () => {
    expect(Money.fromCents(1000).equals(Money.fromCents(1000))).toBe(true)
    expect(Money.fromCents(1000).equals(Money.fromCents(999))).toBe(false)
  })

  test('fromReais arredonda corretamente valores de 2 casas (domínio real)', () => {
    expect(Money.fromReais(0.07).amountInCents).toBe(7n) // 0.07*100 = 6.999... → round 7
    expect(Money.fromReais(19.99).amountInCents).toBe(1999n)
    expect(Money.fromReais(0.29).amountInCents).toBe(29n)
    // Entradas de 3 casas têm limite conhecido do float (fora do domínio Pix/2 casas):
    // 1.005*100 = 100.4999... → round 100. Documentado, não usado para cálculo.
    expect(Money.fromReais(1.005).amountInCents).toBe(100n)
  })

  test('fromCents trunca números fracionários', () => {
    expect(Money.fromCents(10.9).amountInCents).toBe(10n)
  })

  test('rejeita reais não-finitos', () => {
    expect(() => Money.fromReais(Number.POSITIVE_INFINITY)).toThrow(ValidationError)
    expect(() => Money.fromReais(Number.NaN)).toThrow(ValidationError)
  })

  test('suporta valores grandes sem perda (bigint)', () => {
    const big = Money.fromCents(999_999_999_999n)
    expect(big.amountInCents).toBe(999_999_999_999n)
    expect(big.add(Money.fromCents(1n)).amountInCents).toBe(1_000_000_000_000n)
  })

  test('zero não é positivo', () => {
    expect(Money.fromCents(0).isPositive()).toBe(false)
    expect(Money.fromCents(1).isPositive()).toBe(true)
  })
})
