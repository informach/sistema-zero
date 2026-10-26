import type { RecoveryMessageReceipt, RecoveryMessageRequest } from './recovery-messaging.port'
import type { RecoveryLease } from './recovery-repository.port'

export type RecoveryNoticePurpose = 'INITIAL' | 'REMINDER' | 'RECOVERED' | 'CANCELED'
export interface RecoveryNoticeSnapshot {
  id: string
  caseId: string
  purpose: RecoveryNoticePurpose
  /** Zero for non-reminder notices; reminder days come from the case's frozen policy. */
  day: number
  request: RecoveryMessageRequest
  createdAt: Date
  attemptCount: number
  lastAttemptAt: Date | null
  receipt: RecoveryMessageReceipt | null
  observedAt: Date | null
}

export interface RecoveryNoticeRepository {
  /** Persist the exact envelope before network I/O; replay returns the original envelope. */
  prepare(
    lease: RecoveryLease,
    input: {
      purpose: RecoveryNoticePurpose
      day: number
      request: Omit<RecoveryMessageRequest, 'idempotencyKey'>
      now: Date
    },
  ): Promise<RecoveryNoticeSnapshot>
  listForCase(caseId: string): Promise<RecoveryNoticeSnapshot[]>
  recordAttempt(lease: RecoveryLease, noticeId: string, now: Date): Promise<void>
  /** Case lease fences stale writers; message identity and acceptance never change. */
  recordReceipt(
    lease: RecoveryLease,
    noticeId: string,
    receipt: RecoveryMessageReceipt,
    now: Date,
  ): Promise<void>
}
