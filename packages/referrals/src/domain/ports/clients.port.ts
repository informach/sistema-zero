/**
 * Clients S2S do consumer de conversões (rede privada DIRETA, sem gateway —
 * mesmo desenho do fiscal): o payload do `payment.paid` tem só 6 campos, então
 * o consumer ENRIQUECE no payments e classifica a oferta no catalog.
 */
export interface PaymentSnapshot {
  id: string
  status: string
  /** bigint: `amountInCents` chega como STRING na view interna (não é JSON-safe). */
  amountInCents: bigint
  paidAt: Date | null
  customer: { name?: string; email?: string; document?: string } | null
  metadata: Record<string, unknown>
  subscriptionId: string | null
}

export interface PaymentsClient {
  /** `GET /payments/internal/payments/:id` (x-internal-token). 404 → null. */
  getPayment(paymentId: string): Promise<PaymentSnapshot | null>
}

export interface OfferSnapshot {
  id: string
  slug: string
  name: string
}

export interface CatalogClient {
  /** `GET /catalog/offers/:id` (público; aceita UUID). 404 → null. */
  getOfferById(offerId: string): Promise<OfferSnapshot | null>
}
