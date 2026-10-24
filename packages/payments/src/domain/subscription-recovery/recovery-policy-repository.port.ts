import type { RecoveryPolicy } from './recovery-policy'

export interface RecoveryPolicyConfiguration {
  policy: RecoveryPolicy
  enabled: boolean
  activatedAt: Date | null
  updatedAt: Date
  updatedBy: string
}

export interface RecoveryPolicyRepository {
  get(): Promise<RecoveryPolicyConfiguration | null>
  /** Seed idempotente; não ativa o processo nem sobrescreve decisão do operador. */
  initialize(now: Date): Promise<RecoveryPolicyConfiguration>
  update(input: {
    expectedVersion: number
    windowDays: number
    reminderDays: readonly number[]
    enabled: boolean
    actorId: string
    now: Date
  }): Promise<RecoveryPolicyConfiguration>
}
