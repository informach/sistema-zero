/**
 * Saúde de destinos upstream. Combina sinais ativos (probe periódico) e passivos
 * (ejeção após N falhas consecutivas, readmissão após sucesso).
 */
export interface HealthRegistry {
  isHealthy(targetId: string): boolean
  recordSuccess(targetId: string): void
  recordFailure(targetId: string): void
  /** Snapshot para readiness/observabilidade. */
  snapshot(): Record<string, boolean>
}
