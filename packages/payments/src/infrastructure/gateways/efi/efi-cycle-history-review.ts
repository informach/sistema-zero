import { parseSubscriptionCharges, parseSubscriptionDetail } from './efi-cobrancas.mapper'

/** Strict evidence for the bounded, all-paid legacy repair; incomplete/ambiguous histories are not normalized. */
export function allPaidCycleHistory(
  raw: unknown,
  providerSubscriptionId: string,
  observedAt: Date,
): string[] | null {
  if (!raw || typeof raw !== 'object' || !Number.isFinite(observedAt.getTime())) return null
  const envelope = raw as Record<string, unknown>
  const data =
    envelope.data && typeof envelope.data === 'object'
      ? (envelope.data as Record<string, unknown>)
      : envelope
  const history = data.history
  if (
    String(data.subscription_id ?? data.id ?? '') !== providerSubscriptionId ||
    !Array.isArray(history) ||
    history.length < 1 ||
    history.length > 100 ||
    history.some(
      (entry) =>
        !entry || typeof entry !== 'object' || !['paid', 'refunded'].includes(entry.status),
    )
  )
    return null
  const source = parseSubscriptionDetail(raw, providerSubscriptionId)
  const charges = parseSubscriptionCharges(raw)
  if (
    source.status !== 'ACTIVE' ||
    charges.length !== history.length ||
    charges.some(
      (charge) =>
        !charge.createdAt ||
        !Number.isFinite(charge.createdAt.getTime()) ||
        charge.createdAt > observedAt ||
        !['PAID', 'REFUNDED'].includes(charge.status),
    )
  )
    return null
  const ids = charges.map((charge) => charge.chargeId)
  return new Set(ids).size === ids.length ? ids.sort() : null
}
