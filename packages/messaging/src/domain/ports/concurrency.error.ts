/**
 * Lançado quando um `save` com controle de concorrência otimista encontra uma
 * versão divergente — outro processo/réplica gravou o mesmo agregado nesse
 * intervalo. Contrato dos REPOSITÓRIOS (port): a aplicação pode reagir
 * (recarregar e re-aplicar) sem conhecer o adapter concreto.
 */
export class ConcurrencyConflictError extends Error {
  readonly code = 'CONCURRENCY_CONFLICT'

  constructor(aggregateId: string) {
    super(`Conflito de concorrência ao salvar o agregado ${aggregateId}`)
    this.name = 'ConcurrencyConflictError'
  }
}
