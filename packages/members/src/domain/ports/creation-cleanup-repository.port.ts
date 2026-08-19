export interface CreationCleanupJob {
  id: string
  accountId: string
  userIds: string[]
  prefixes: string[]
  attempts: number
}

/** Fila durável da limpeza R2 posterior ao vencimento das URLs pré-assinadas. */
export interface CreationCleanupRepository {
  claimDue(now: Date, leaseExpiredBefore: Date): Promise<CreationCleanupJob | null>
  complete(id: string, now: Date): Promise<boolean>
  fail(id: string, error: string, now: Date, retryAt: Date): Promise<boolean>
}
