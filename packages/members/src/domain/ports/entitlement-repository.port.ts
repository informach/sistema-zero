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
  /**
   * Revoga (corte imediato) TODAS as matrículas da assinatura num único UPDATE
   * atômico — sem load-mutate-save por linha (evita lost-update sob concorrência
   * com um grant de renovação). Idempotente: não toca em quem já está `revoked`.
   * Retorna o nº de linhas afetadas.
   */
  revokeBySubscriptionId(subscriptionId: string, now: Date): Promise<number>
  /**
   * Expira (fim natural) TODAS as matrículas da assinatura num único UPDATE
   * atômico. Idempotente: não rebaixa `revoked` nem reexpira `expired`.
   */
  expireBySubscriptionId(subscriptionId: string, now: Date): Promise<number>
}
