import { ValueObject } from '../shared/value-object'
import { ValidationError } from '../shared/errors'

export type Currency = 'BRL'

interface MoneyProps {
  amountInCents: bigint
  currency: Currency
}

/**
 * Valor monetário representado em centavos com `bigint` para evitar erros de
 * ponto flutuante. Imutável; operações retornam novas instâncias.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props)
  }

  static fromCents(cents: bigint | number, currency: Currency = 'BRL'): Money {
    const value = typeof cents === 'bigint' ? cents : BigInt(Math.trunc(cents))
    if (value < 0n) {
      throw new ValidationError('Valor monetário não pode ser negativo')
    }
    return new Money({ amountInCents: value, currency })
  }

  static fromReais(reais: number, currency: Currency = 'BRL'): Money {
    if (!Number.isFinite(reais)) {
      throw new ValidationError('Valor monetário inválido')
    }
    return Money.fromCents(Math.round(reais * 100), currency)
  }

  get amountInCents(): bigint {
    return this.props.amountInCents
  }

  get currency(): Currency {
    return this.props.currency
  }

  add(other: Money): Money {
    this.assertSameCurrency(other)
    return Money.fromCents(this.props.amountInCents + other.amountInCents, this.props.currency)
  }

  isPositive(): boolean {
    return this.props.amountInCents > 0n
  }

  /** Valor em reais (use apenas para exibição/serialização, nunca para cálculo). */
  toReais(): number {
    return Number(this.props.amountInCents) / 100
  }

  override toString(): string {
    return `${this.props.currency} ${this.toReais().toFixed(2)}`
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.props.currency) {
      throw new ValidationError(
        `Não é possível operar moedas diferentes: ${this.props.currency} e ${other.currency}`,
      )
    }
  }
}
