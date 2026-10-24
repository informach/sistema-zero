import { ValidationError } from '../shared/errors'
import type { SubscriptionRecoveryCase } from './recovery-case'

export interface ReviewedAdmissionAudit {
  caseId: string
  paymentId: string
  actorId: string
  requestId: string
  audience: 'kids' | 'adult'
  policyVersion: number
  paymentVersion: number
  sourceObservedAt: Date
  sourceChargeCreatedAt: Date
  approvedAt: Date
}

export function readReviewedAdmissionAudit(value: ReviewedAdmissionAudit): ReviewedAdmissionAudit {
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  if (
    !value.actorId?.trim() ||
    value.actorId.length > 200 ||
    !uuid.test(value.caseId) ||
    !uuid.test(value.paymentId) ||
    !uuid.test(value.requestId) ||
    !['kids', 'adult'].includes(value.audience) ||
    !Number.isSafeInteger(value.policyVersion) ||
    value.policyVersion < 0 ||
    !Number.isSafeInteger(value.paymentVersion) ||
    value.paymentVersion < 0 ||
    ![value.sourceObservedAt, value.sourceChargeCreatedAt, value.approvedAt].every((date) =>
      Number.isFinite(date.getTime()),
    ) ||
    value.sourceObservedAt > value.approvedAt ||
    value.sourceChargeCreatedAt > value.sourceObservedAt ||
    value.approvedAt.getTime() - value.sourceObservedAt.getTime() > 60_000
  )
    throw new ValidationError('Revisão histórica inválida ou vencida')
  return {
    ...value,
    actorId: value.actorId.trim(),
    requestId: value.requestId.toLowerCase(),
    sourceObservedAt: new Date(value.sourceObservedAt),
    sourceChargeCreatedAt: new Date(value.sourceChargeCreatedAt),
    approvedAt: new Date(value.approvedAt),
  }
}

export interface ReviewedAdmissionRepository {
  findByPaymentId(paymentId: string): Promise<ReviewedAdmissionAudit | null>
  /** Reuses human classification only for the exact same merchant/provider contract. */
  resolveAudience(input: {
    subscriptionId: string
    consumerId: string
    providerSubscriptionId: string
    now: Date
  }): Promise<'kids' | 'adult' | null>
  /** Case, permanent human review and fenced admission receipt commit together; no external effects. */
  create(item: SubscriptionRecoveryCase, audit: ReviewedAdmissionAudit): Promise<string>
}
