import type { SubscriptionRecoveryCase } from './recovery-case'

export interface RecoveryLease {
  item: SubscriptionRecoveryCase
  leaseId: string
  leaseUntil: Date
}

export interface SubscriptionRecoveryRepository {
  /** Atomicamente recusa segunda origem/caso aberto para a mesma assinatura. */
  create(item: SubscriptionRecoveryCase): Promise<boolean>
  findById(id: string): Promise<SubscriptionRecoveryCase | null>
  findByPaymentId(paymentId: string): Promise<SubscriptionRecoveryCase | null>
  findActiveForSubscription(subscriptionId: string): Promise<SubscriptionRecoveryCase | null>
  /** Includes bounded retries of unsent closeout confirmations, without reopening a case. */
  claimDue(input: { now: Date; leaseMs: number; limit: number }): Promise<RecoveryLease[]>
  /** CAS + fencing e prazo do lease; grava eventos na mesma transação. */
  saveOwned(lease: RecoveryLease, now: Date): Promise<void>
}
