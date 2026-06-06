/**
 * Janela de garantia da oferta comprada — lógica PURA (unit-testada); o adapter
 * `server/payments.ts` resolve `offerId → guaranteeDays` no catálogo e anexa.
 */
import type { PaymentGuarantee } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

/** paidAt + guaranteeDays → janela de garantia. `null` sem paidAt/garantia configurada. */
export function computeGuarantee(
  paidAt: string | null,
  guaranteeDays: number | null | undefined,
  now = new Date(),
): PaymentGuarantee | null {
  if (!paidAt || guaranteeDays == null || guaranteeDays <= 0) return null
  const paid = new Date(paidAt)
  if (Number.isNaN(paid.getTime())) return null
  const until = new Date(paid.getTime() + guaranteeDays * DAY_MS)
  const msLeft = until.getTime() - now.getTime()
  return {
    until: until.toISOString(),
    daysLeft: Math.max(0, Math.ceil(msLeft / DAY_MS)),
    expired: msLeft < 0,
    guaranteeDays,
  }
}
