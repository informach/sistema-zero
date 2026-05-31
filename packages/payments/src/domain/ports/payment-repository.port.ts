import type { PaymentAggregate } from '../payment/payment.aggregate'

export interface ClaimedCharge {
  payment: PaymentAggregate
  /** Nº de tentativas de criação de cobrança (pós-incremento deste claim). */
  attempts: number
}

/**
 * Port (driven) de persistência do agregado de pagamento.
 *
 * `save` grava o agregado E os eventos de domínio acumulados no outbox dentro da
 * MESMA transação (transactional outbox) — garantindo que nenhum evento se perca
 * nem seja publicado sem que o estado tenha sido persistido.
 */
export interface PaymentRepository {
  save(payment: PaymentAggregate): Promise<void>
  findById(id: string): Promise<PaymentAggregate | null>
  findByIdempotencyKey(consumerId: string, idempotencyKey: string): Promise<PaymentAggregate | null>
  findByTxid(txid: string): Promise<PaymentAggregate | null>
  findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentAggregate | null>

  /**
   * Reivindica (claim) um lote de pagamentos PENDING aguardando criação de
   * cobrança no provedor (modo assíncrono — Pix ou boleto). Seguro para múltiplas
   * instâncias via `FOR UPDATE SKIP LOCKED`; incrementa o contador de tentativas e
   * marca o claim (claims expirados após `staleAfterMs` voltam à fila).
   */
  claimPendingCharges(limit: number, staleAfterMs: number): Promise<ClaimedCharge[]>

  /**
   * Pagamentos PENDING com cobrança já criada, mas sem confirmação há mais de
   * `olderThanMs` — usados pelo job de reconciliação (re-consulta na Efí, para
   * capturar webhooks perdidos).
   */
  findStalePendingCharges(limit: number, olderThanMs: number): Promise<PaymentAggregate[]>
}
