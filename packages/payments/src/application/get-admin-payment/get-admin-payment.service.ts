import type { BusinessAudienceFilter } from '../../domain/business-audience'
import { PaymentNotFoundError } from '../../domain/payment/payment.errors'
import type { PaymentAdminReadRepository } from '../../domain/ports/payment-admin-read.port'
import { type AdminPaymentView, toAdminPaymentView } from '../mappers/admin-payment-view'

/**
 * Consulta admin de um pagamento por id — **cross-consumer** (o painel enxerga
 * todos os consumidores), ao contrário do `GetPaymentService` (escopado).
 */
export class GetAdminPaymentService {
  constructor(private readonly payments: Pick<PaymentAdminReadRepository, 'findById'>) {}

  async execute(id: string, audience?: BusinessAudienceFilter): Promise<AdminPaymentView> {
    const payment = await this.payments.findById(id, audience)
    if (!payment) throw new PaymentNotFoundError(id)
    return toAdminPaymentView(payment)
  }
}
