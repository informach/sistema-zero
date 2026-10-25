import { ValidationError } from '../../src/domain/shared/errors'
import {
  INITIAL_RECOVERY_POLICY,
  snapshotRecoveryPolicy,
} from '../../src/domain/subscription-recovery/recovery-policy'
import type {
  RecoveryPolicyConfiguration,
  RecoveryPolicyRepository,
} from '../../src/domain/subscription-recovery/recovery-policy-repository.port'
import { ConcurrencyConflictError } from '../../src/infrastructure/persistence/drizzle/concurrency.error'

/** HTTP fixture only. Transactional policy/audit guarantees are tested with real Postgres. */
export class InMemoryRecoveryPolicyRepository implements RecoveryPolicyRepository {
  private current: RecoveryPolicyConfiguration | null = null
  async get() {
    return structuredClone(this.current)
  }
  async initialize(now: Date) {
    this.current ??= {
      policy: INITIAL_RECOVERY_POLICY,
      enabled: false,
      activatedAt: null,
      updatedAt: now,
      updatedBy: 'system:initial-policy',
    }
    return structuredClone(this.current)
  }
  async update(input: Parameters<RecoveryPolicyRepository['update']>[0]) {
    if (!this.current || input.expectedVersion !== this.current.policy.version)
      throw new ConcurrencyConflictError('qa-policy')
    if (!input.actorId) throw new ValidationError('Missing actor')
    this.current = {
      policy: snapshotRecoveryPolicy({
        version: input.expectedVersion + 1,
        windowDays: input.windowDays,
        reminderDays: input.reminderDays,
      }),
      enabled: input.enabled,
      activatedAt: input.enabled
        ? (this.current.activatedAt ?? input.now)
        : this.current.activatedAt,
      updatedAt: input.now,
      updatedBy: input.actorId,
    }
    return structuredClone(this.current)
  }
}
