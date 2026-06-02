import { ValidationError } from '../shared/errors'
import { ValueObject } from '../shared/value-object'

export type Currency = 'BRL'

interface MoneyProps {
  amountInCents: number
  currency: Currency
}

/**
 * Teto de valor (centavos). Cabe com folga em `int4` (coluna do Postgres, máx
 * 2_147_483_647) e espelha o teto dos DTOs TypeBox. Acima disso o insert estouraria
 * a coluna — então o invariante falha cedo no domínio (não só na borda HTTP).
 */
const MAX_CENTS = 2_000_000_000

/**
 * Valor monetário em centavos (inteiro) — invariante do monorepo (dinheiro nunca
 * em ponto flutuante). Preços de catálogo cabem em `int4`; por isso `number` aqui
 * (o payments usa `bigint` no seu contexto). Imutável.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props)
  }

  static fromCents(cents: number, currency: Currency = 'BRL'): Money {
    if (!Number.isInteger(cents)) {
      throw new ValidationError('Valor monetário deve ser um inteiro em centavos')
    }
    if (cents < 0) {
      throw new ValidationError('Valor monetário não pode ser negativo')
    }
    if (cents > MAX_CENTS) {
      throw new ValidationError('Valor monetário acima do máximo permitido')
    }
    return new Money({ amountInCents: cents, currency })
  }

  get amountInCents(): number {
    return this.props.amountInCents
  }

  get currency(): Currency {
    return this.props.currency
  }

  isPositive(): boolean {
    return this.props.amountInCents > 0
  }

  /** Valor em reais (use apenas para exibição/serialização, nunca para cálculo). */
  toReais(): number {
    return this.props.amountInCents / 100
  }

  override toString(): string {
    return `${this.props.currency} ${this.toReais().toFixed(2)}`
  }
}
