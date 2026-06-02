import { describe, expect, it } from 'bun:test'
import { ValidationError } from '../../src/domain/shared/errors'
import { Money } from '../../src/domain/value-objects/money'

describe('Money', () => {
  it('cria a partir de centavos e converte para reais (só exibição)', () => {
    const m = Money.fromCents(3700)
    expect(m.amountInCents).toBe(3700)
    expect(m.currency).toBe('BRL')
    expect(m.toReais()).toBe(37)
    expect(m.toString()).toBe('BRL 37.00')
  })

  it('rejeita valor negativo', () => {
    expect(() => Money.fromCents(-1)).toThrow(ValidationError)
  })

  it('rejeita valor não inteiro (centavos fracionados)', () => {
    expect(() => Money.fromCents(10.5)).toThrow(ValidationError)
  })

  it('rejeita valor acima do teto (cabe em int4)', () => {
    expect(() => Money.fromCents(2_000_000_001)).toThrow(ValidationError)
    expect(Money.fromCents(2_000_000_000).amountInCents).toBe(2_000_000_000)
  })

  it('zero não é positivo', () => {
    expect(Money.fromCents(0).isPositive()).toBe(false)
    expect(Money.fromCents(1).isPositive()).toBe(true)
  })
})
