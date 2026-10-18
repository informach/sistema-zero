/**
 * Tipos de job que um worker pode DECLARAR que entende, além da limpeza de conta (sempre
 * entendida). `pensa` = apagar só os arquivos de um plano, SEM finalizar exclusão de conta.
 */
export const CREATION_CLEANUP_SCOPES = ['pensa', 'gallery'] as const
export type CreationCleanupScope = (typeof CREATION_CLEANUP_SCOPES)[number]

export interface CreationCleanupJob {
  scope?: CreationCleanupScope
  id: string
  accountId: string
  userIds: string[]
  prefixes: string[]
  attempts: number
}

/** Fila durável da limpeza R2 posterior ao vencimento das URLs pré-assinadas. */
export interface CreationCleanupRepository {
  /**
   * ⚠️ Job com `scope` só sai para quem o declarou em `scopes`. Um worker antigo trata
   * todo job como exclusão de conta e chamaria o finalize com a conta da família.
   */
  claimDue(
    now: Date,
    leaseExpiredBefore: Date,
    scopes: readonly CreationCleanupScope[],
  ): Promise<CreationCleanupJob | null>
  complete(id: string, now: Date): Promise<boolean>
  fail(id: string, error: string, now: Date, retryAt: Date): Promise<boolean>
}
