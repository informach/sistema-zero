import { PaymentNotFoundError } from '../../domain/payment/payment.errors'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import { type AdminPaymentView, toAdminPaymentView } from '../mappers/admin-payment-view'

/**
 * Consulta admin de um pagamento por id — **cross-consumer** (o painel enxerga
 * todos os consumidores), ao contrário do `GetPaymentService` (escopado).
 */
export class GetAdminPaymentService {
  constructor(private readonly payments: PaymentRepository) {}

  async execute(id: string): Promise<AdminPaymentView> {
    const payment = await this.payments.findById(id)
    if (!payment) throw new PaymentNotFoundError(id)
    return toAdminPaymentView(payment)
  }
}
