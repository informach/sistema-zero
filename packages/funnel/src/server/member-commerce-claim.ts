import { z } from 'zod'
import type { GatewayClient } from '../lib/gateway-client'
import type { MemberCommerceUnit } from './member-commerce-store'

const stateSchema = z.object({ status: z.string() })
const accessSchema = z.object({
  items: z.array(
    z.object({ productId: z.string().nullable(), kind: z.enum(['gift', 'manual', 'paid']) }),
  ),
})
/** Executado sob lock de conta/produto. Falha de leitura conserva a reivindicação. */
export async function canReleaseProductClaim(
  unit: MemberCommerceUnit,
  gateway: GatewayClient,
  accountId: string,
  productId: string,
): Promise<boolean> {
  if (!unit.claim) return true
  const lead = await unit.repo.getLead(unit.claim.leadId)
  if (!lead || lead.buyerUserId !== accountId) return false
  if (!lead.paymentId && !lead.subscriptionId) return false
  if (lead.subscriptionId) {
    const result = await gateway.getSubscription(lead.subscriptionId)
    const parsed = stateSchema.safeParse(result.body)
    if (
      result.status !== 200 ||
      !parsed.success ||
      !['CANCELED', 'EXPIRED'].includes(parsed.data.status)
    )
      return false
  }
  if (!lead.paymentId) return false
  const result = await gateway.getPayment(lead.paymentId)
  const parsed = stateSchema.safeParse(result.body)
  if (result.status !== 200 || !parsed.success) return false
  const terminal = ['FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED'].includes(parsed.data.status)
  if (!terminal && (parsed.data.status !== 'PAID' || !lead.paidAt || !lead.membersGrantedAt))
    return false
  const facts = await gateway.getCommerceAccess(accountId)
  const access = accessSchema.safeParse(facts.body)
  return (
    facts.status === 200 &&
    access.success &&
    !access.data.items.some((item) => item.productId === productId && item.kind !== 'gift')
  )
}
