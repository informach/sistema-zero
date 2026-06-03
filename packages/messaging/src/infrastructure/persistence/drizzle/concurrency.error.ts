/**
 * Lançado quando um `save` com controle de concorrência otimista encontra uma
 * versão divergente — outro processo/réplica gravou o mesmo agregado nesse
 * intervalo. O chamador (worker/webhook) deve tratar como "outro venceu a corrida"
 * (geralmente: ignorar — o estado já foi atualizado por quem venceu).
 */
export class ConcurrencyConflictError extends Error {
  readonly code = 'CONCURRENCY_CONFLICT'

  constructor(aggregateId: string) {
    super(`Conflito de concorrência ao salvar o agregado ${aggregateId}`)
    this.name = 'ConcurrencyConflictError'
  }
}
