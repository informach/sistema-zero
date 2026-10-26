import type { RecoveryPolicy } from './recovery-policy'

export type RecoveryAdmissionReason =
  | 'AUDIENCE_UNKNOWN'
  | 'LEGACY_RENEWAL'
  | 'SOURCE_DATE_UNKNOWN'
  | 'NO_LONGER_ELIGIBLE'
  | 'CASE_EXISTS'
  | 'PROVIDER_DIVERGENCE'
  | 'PROVIDER_UNAVAILABLE'
export interface RecoveryAdmissionLease {
  paymentId: string
  policy: RecoveryPolicy
  activatedAt: Date
  discoveredAt: Date
  attempts: number
  leaseId: string
  leaseUntil: Date
}
export type RecoveryAdmissionDecision =
  | { state: 'ADMITTED'; caseId: string; reason: null }
  | { state: 'REVIEW' | 'IGNORED'; caseId: null; reason: RecoveryAdmissionReason }

/** Admission has no financial side effects; uncertain origins remain visible for review. */
export interface RecoveryAdmissionRepository {
  discover(input: { now: Date; limit: number }): Promise<number>
  claim(input: { now: Date; leaseMs: number; limit: number }): Promise<RecoveryAdmissionLease[]>
  complete(
    lease: RecoveryAdmissionLease,
    decision: RecoveryAdmissionDecision,
    now: Date,
  ): Promise<void>
  retry(lease: RecoveryAdmissionLease, now: Date): Promise<void>
}
