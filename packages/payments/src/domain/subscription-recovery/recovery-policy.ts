import { ValidationError } from '../shared/errors'

export interface RecoveryPolicy {
  version: number
  windowDays: number
  reminderDays: readonly number[]
}

export const INITIAL_RECOVERY_POLICY: RecoveryPolicy = Object.freeze({
  version: 1,
  windowDays: 7,
  reminderDays: Object.freeze([3, 6]),
})

export const DAY_MS = 86_400_000

export function snapshotRecoveryPolicy(policy: RecoveryPolicy): RecoveryPolicy {
  if (
    !Number.isSafeInteger(policy.version) ||
    policy.version < 1 ||
    !Number.isSafeInteger(policy.windowDays) ||
    policy.windowDays < 1 ||
    policy.windowDays > 30 ||
    policy.reminderDays.length > 3 ||
    policy.reminderDays.some(
      (day, index, all) =>
        !Number.isSafeInteger(day) ||
        day <= 0 ||
        day >= policy.windowDays ||
        (index > 0 && day <= all[index - 1]!),
    )
  ) {
    throw new ValidationError('Política de regularização inválida')
  }
  return Object.freeze({ ...policy, reminderDays: Object.freeze([...policy.reminderDays]) })
}
