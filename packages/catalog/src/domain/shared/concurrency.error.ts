import { DomainError } from './errors'

/**
 * Conflito de concorrência otimista: o agregado foi alterado por outro writer
 * entre a leitura e a escrita (a versão esperada não bateu). → 409
 */
export class ConcurrencyConflictError extends DomainError {
  readonly code = 'CONCURRENCY_CONFLICT'
  constructor(message = 'Conflito de concorrência: recarregue e tente novamente') {
    super(message)
  }
}
