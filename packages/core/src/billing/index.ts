export interface BillingPeriod {
  startsAt: string
  endsAt: string
}
export type SubscriptionCycleAccess =
  | { version: 1; kind: 'VERIFIED_PERIOD'; period: BillingPeriod }
  | { version: 1; kind: 'REVIEW_REQUIRED'; reason: 'PERIOD_UNAVAILABLE' | 'SOURCE_DIVERGENCE' }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function iso(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 40) return false
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value
}

/** Strict shared wire boundary; unknown dates never turn into an access grant. */
export function readBillingPeriod(value: unknown): BillingPeriod {
  if (
    !record(value) ||
    Object.keys(value).length !== 2 ||
    !iso(value.startsAt) ||
    !iso(value.endsAt)
  )
    throw new Error('Período de cobrança inválido')
  const duration = Date.parse(value.endsAt) - Date.parse(value.startsAt)
  if (duration <= 0 || duration > 3661 * 86_400_000) throw new Error('Período de cobrança inválido')
  return { startsAt: value.startsAt, endsAt: value.endsAt }
}

export function readSubscriptionCycleAccess(value: unknown): SubscriptionCycleAccess | null {
  if (value === null || value === undefined) return null
  if (!record(value) || value.version !== 1 || Object.keys(value).length !== 3)
    throw new Error('Conferência do acesso da renovação inválida')
  if (value.kind === 'VERIFIED_PERIOD')
    return { version: 1, kind: value.kind, period: readBillingPeriod(value.period) }
  if (
    value.kind === 'REVIEW_REQUIRED' &&
    (value.reason === 'PERIOD_UNAVAILABLE' || value.reason === 'SOURCE_DIVERGENCE')
  )
    return { version: 1, kind: value.kind, reason: value.reason }
  throw new Error('Conferência do acesso da renovação inválida')
}
