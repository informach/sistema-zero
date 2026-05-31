import { PaymentNotFoundError } from '../../domain/payment/payment.errors'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import { type PaymentView, toPaymentView } from '../mappers/payment-view'

/** Caso de uso de consulta de um pagamento pelo identificador. */
export class GetPaymentService {
  constructor(private readonly payments: PaymentRepository) {}

  /**
   * Consulta **escopada por consumidor**: um consumidor só enxerga os próprios
   * pagamentos. Pagamento de outro dono é tratado como inexistente (404, sem
   * revelar a existência do id) — evita IDOR/BOLA entre sistemas consumidores.
   */
  async execute(consumerId: string, id: string): Promise<PaymentView> {
    const payment = await this.payments.findById(id)
    if (!payment || payment.consumerId !== consumerId) throw new PaymentNotFoundError(id)
    return toPaymentView(payment)
  }
}
