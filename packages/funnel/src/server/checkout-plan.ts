import type { FunnelRepo } from '../db/repo'

/** Pedido de servidor congelado depois da cotação/consentimento, antes do efeito externo.
 * bodyJson é texto para preservar também a ordem dos campos na chave/hash de idempotência.
 * Contém somente token Efí, nunca PAN/CVV. Deve ser removido quando o recibo for conhecido.
 */
export type CheckoutPlan = {
  id: string
  leadId: string
  offerRef: string
  couponCode: string | null
  idempotencyKey: string
  bodyJson: string
  paymentContext: NonNullable<Parameters<FunnelRepo['setPayment']>[3]>
} & (
  | { kind: 'pix' | 'card'; intervalMonths: null }
  | { kind: 'subscription'; intervalMonths: number }
)
