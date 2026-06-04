import { PaymentNotFoundError } from '../../domain/payment/payment.errors'
import type { PaymentMyReadRepository } from '../../domain/ports/payment-my-read.port'
import { type PaymentView, toPaymentView } from '../mappers/payment-view'

/**
 * Detalhe de uma compra do PRÓPRIO comprador. O repositório é escopado por
 * e-mail: id de outro comprador → mesmo 404 de id inexistente (não vaza nada).
 */
export class GetMyPaymentService {
  constructor(private readonly payments: PaymentMyReadRepository) {}

  async execute(input: { email: string; id: string }): Promise<PaymentView> {
    const payment = await this.payments.findByEmailAndId(input.email, input.id)
    if (!payment) throw new PaymentNotFoundError(input.id)
    return toPaymentView(payment)
  }
}
