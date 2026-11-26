/**
 * Port (driven) de LEITURA S2S para o referrals (25/11/2026): as ofertas que um e-mail já pagou
 * ANTES de uma data. O bônus do embaixador é só da PRIMEIRA assinatura da pessoa, e o histórico
 * de compras de antes da origem por aquisição só existe aqui. Devolve apenas os ids das ofertas
 * (`metadata.offerId`) de pagamentos `PAID`, sem valor, cartão ou dados do cliente.
 */
export interface PaidOffersQuery {
  /** E-mail do comprador (`customer->>'email'`, comparado sem caixa). */
  email: string
  /** Só pagamentos confirmados ANTES deste instante (exclusivo). */
  before: Date
  /** O pagamento que está sendo classificado não conta como histórico dele mesmo. */
  excludePaymentId?: string
}

export interface PaidOffersReader {
  /** Ids distintos das ofertas, no máximo `PAID_OFFERS_LIMIT`. */
  listPaidOfferIds(query: PaidOffersQuery): Promise<string[]>
}

export const PAID_OFFERS_LIMIT = 50
