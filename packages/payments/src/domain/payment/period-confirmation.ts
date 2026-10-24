import { ValidationError } from '../shared/errors'

export interface PeriodConfirmationAuthority {
  actorId: string
  requestId: string
  providerSubscriptionId: string
  sourceObservedAt: Date
}
/** Permanent decision evidence; no card/customer payload or expiring outbox dependency. */
export interface PeriodConfirmationAudit {
  actorId: string
  requestId: string
  providerSubscriptionId: string
  sourceObservedAt: string
  confirmedAt: string
  previousReason: string
}
export function confirmPeriodAuthority(
  input: PeriodConfirmationAuthority,
  now: Date,
  previousReason: string,
): PeriodConfirmationAudit {
  if (
    !input.actorId?.trim() ||
    input.actorId.length > 200 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId) ||
    !input.providerSubscriptionId ||
    input.providerSubscriptionId.length > 200 ||
    !Number.isFinite(input.sourceObservedAt.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    now < input.sourceObservedAt ||
    now.getTime() - input.sourceObservedAt.getTime() > 60_000
  )
    throw new ValidationError('Autoridade de conferência do período inválida ou vencida')
  return {
    actorId: input.actorId.trim(),
    requestId: input.requestId,
    providerSubscriptionId: input.providerSubscriptionId,
    sourceObservedAt: input.sourceObservedAt.toISOString(),
    confirmedAt: now.toISOString(),
    previousReason,
  }
}
