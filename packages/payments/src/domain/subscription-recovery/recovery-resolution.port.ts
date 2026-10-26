import { ValidationError } from '../shared/errors'

/** Permanent evidence of a later paid cycle; the original failed receipt is untouched. */
export interface RecoveryResolutionAudit {
  caseId: string
  actorId: string
  requestId: string
  paymentId: string
  paymentVersion: number
  subscriptionVersion: number
  originalPaymentVersion: number
  providerPaymentId: string
  originalChargeCreatedAt: Date
  chargeCreatedAt: Date
  periodStartsAt: Date
  periodEndsAt: Date
  observedAt: Date
  resolvedAt: Date
}

export function readRecoveryResolution(value: RecoveryResolutionAudit): RecoveryResolutionAudit {
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  if (
    !uuid.test(value.caseId) ||
    !uuid.test(value.paymentId) ||
    !uuid.test(value.requestId) ||
    !value.actorId?.trim() ||
    value.actorId.length > 200 ||
    !value.providerPaymentId?.trim() ||
    value.providerPaymentId.length > 200 ||
    ![value.paymentVersion, value.subscriptionVersion, value.originalPaymentVersion].every(
      (version) => Number.isSafeInteger(version) && version >= 0,
    ) ||
    ![
      value.originalChargeCreatedAt,
      value.chargeCreatedAt,
      value.periodStartsAt,
      value.periodEndsAt,
      value.observedAt,
      value.resolvedAt,
    ].every((date) => Number.isFinite(date.getTime())) ||
    value.originalChargeCreatedAt >= value.chargeCreatedAt ||
    value.chargeCreatedAt.getTime() !== value.periodStartsAt.getTime() ||
    value.chargeCreatedAt > value.observedAt ||
    value.periodStartsAt > value.observedAt ||
    value.periodEndsAt <= value.periodStartsAt ||
    value.observedAt > value.resolvedAt ||
    value.resolvedAt.getTime() - value.observedAt.getTime() > 60_000
  )
    throw new ValidationError('A prova do ciclo posterior é inválida ou venceu')
  return structuredClone({
    ...value,
    actorId: value.actorId.trim(),
    requestId: value.requestId.toLowerCase(),
  })
}

export interface RecoveryResolutionRepository {
  findByCaseId(caseId: string): Promise<RecoveryResolutionAudit | null>
  /** Revalidates local receipts, source identity, case version/lease and fresh proof inside one transaction. */
  resolve(audit: RecoveryResolutionAudit, expectedVersion: number): Promise<void>
}
