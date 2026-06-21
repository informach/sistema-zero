import { DomainError } from '../shared/errors'

/**
 * Gasto de moeda Zappy sem saldo suficiente (compra de cosmético de avatar/quarto).
 * Fail-CLOSED — gastar sem saldo é erro de negócio. → 402 (Payment Required).
 */
export class InsufficientCoinsError extends DomainError {
  readonly code = 'INSUFFICIENT_COINS'
  constructor(message = 'Você ainda não tem moedas Zappy suficientes para isso') {
    super(message)
  }
}
