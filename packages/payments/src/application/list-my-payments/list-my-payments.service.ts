import type {
  MyPaymentsFilter,
  PaymentMyReadRepository,
} from '../../domain/ports/payment-my-read.port'
import type { Paginated } from '../mappers/paginated'
import { type PaymentView, toPaymentView } from '../mappers/payment-view'

/**
 * "Minhas compras" (self-service do comprador, app community): listagem paginada
 * escopada pelo e-mail das claims. Usa a `PaymentView` PÚBLICA (sem customer/
 * provider/failureReason — diferente da AdminPaymentView do painel).
 */
export class ListMyPaymentsService {
  constructor(private readonly payments: PaymentMyReadRepository) {}

  async execute(filter: MyPaymentsFilter): Promise<Paginated<PaymentView>> {
    const page = await this.payments.listByEmail(filter)
    return {
      items: page.items.map(toPaymentView),
      total: page.total,
      limit: filter.limit,
      offset: filter.offset,
    }
  }
}
