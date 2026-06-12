/** Ports dos serviços internos consumidos pelo fiscal (anti-corrupção). */

/** Visão do pagamento devolvida pela rota interna do payments (AdminPaymentView). */
export interface PaymentSnapshot {
  id: string
  status: string
  amountInCents: bigint
  paidAt: Date | null
  customer: { name: string; email: string; document?: string } | null
  metadata: Record<string, unknown>
  refundedAt: Date | null
}

export interface PaymentsClient {
  /** null = 404 (pagamento não existe); lança em 5xx/timeout (fail-closed). */
  getPayment(paymentId: string): Promise<PaymentSnapshot | null>
}

export interface OfferSnapshot {
  id: string
  name: string
  productName: string | null
  guaranteeDays: number | null
}

export interface CatalogClient {
  /** null = oferta não encontrada/draft; lança em 5xx/timeout. */
  getOfferById(offerId: string): Promise<OfferSnapshot | null>
}
