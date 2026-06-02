import type { EntitlementAggregate } from '../entitlement/entitlement.aggregate'

/**
 * Persistência da matrícula. `save` é uma inserção idempotente (ON CONFLICT DO
 * NOTHING na `idempotencyKey`); `update` usa concorrência otimista (`version`).
 */
export interface EntitlementRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<EntitlementAggregate | null>
  /** Insere; se a `idempotencyKey` já existe, NÃO faz nada e retorna `false`. */
  save(entitlement: EntitlementAggregate): Promise<boolean>
  /** `UPDATE ... WHERE id = ? AND version = ?` → `false` se houve conflito de versão. */
  update(entitlement: EntitlementAggregate): Promise<boolean>
  /** Matrícula ATIVA (status + validade) do aluno para um `courseRef`. */
  findActiveByUserAndCourseRef(
    userId: string,
    courseRef: string,
    now: Date,
  ): Promise<EntitlementAggregate | null>
  /** Todas as matrículas ATIVAS do aluno (qualquer tipo). */
  listActiveByUser(userId: string, now: Date): Promise<EntitlementAggregate[]>
  /** Matrículas ligadas a uma assinatura (para revogar/expirar no cancelamento). */
  findBySubscriptionId(subscriptionId: string): Promise<EntitlementAggregate[]>
}
