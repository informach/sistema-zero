import type {
  AdminPaymentListFilters,
  PaymentAdminReadRepository,
} from '../../domain/ports/payment-admin-read.port'
import { type AdminPaymentView, toAdminPaymentView } from '../mappers/admin-payment-view'
import type { Paginated } from '../mappers/paginated'

/** Listagem paginada de pagamentos (painel admin). */
export class ListPaymentsService {
  constructor(private readonly payments: PaymentAdminReadRepository) {}

  async execute(filters: AdminPaymentListFilters): Promise<Paginated<AdminPaymentView>> {
    const page = await this.payments.list(filters)
    return {
      items: page.items.map(toAdminPaymentView),
      total: page.total,
      limit: filters.limit,
      offset: filters.offset,
    }
  }
}
