import { ValidationError } from '../shared/errors'

/** One technical review of legacy overcounting. It never changes money or lifecycle. */
export interface CycleHistoryReview {
  version: 1
  actorId: 'system:legacy-cycle-history-v1'
  requestId: string
  providerSubscriptionId: string
  subscriptionVersion: number
  before: number
  after: number
  providerPaymentIds: string[]
  sourceObservedAt: string
  reviewedAt: string
}
export function readCycleHistoryReview(value: CycleHistoryReview): CycleHistoryReview {
  const observed = Date.parse(value.sourceObservedAt),
    reviewed = Date.parse(value.reviewedAt)
  if (
    value.version !== 1 ||
    value.actorId !== 'system:legacy-cycle-history-v1' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.requestId) ||
    !value.providerSubscriptionId ||
    value.providerSubscriptionId.length > 200 ||
    !Number.isSafeInteger(value.subscriptionVersion) ||
    value.subscriptionVersion < 0 ||
    !Number.isSafeInteger(value.before) ||
    !Number.isSafeInteger(value.after) ||
    value.after < 1 ||
    value.before <= value.after ||
    value.providerPaymentIds.length !== value.after ||
    value.after > 100 ||
    new Set(value.providerPaymentIds).size !== value.after ||
    value.providerPaymentIds.some(
      (id) => typeof id !== 'string' || id.length < 1 || id.length > 200,
    ) ||
    !Number.isFinite(observed) ||
    !Number.isFinite(reviewed) ||
    observed > reviewed ||
    reviewed - observed > 60_000
  )
    throw new ValidationError('Prova da revisão de ciclos inválida ou vencida')
  return {
    ...value,
    requestId: value.requestId.toLowerCase(),
    providerPaymentIds: [...value.providerPaymentIds].sort(),
  }
}
