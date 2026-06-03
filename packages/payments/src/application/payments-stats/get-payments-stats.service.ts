import type {
  PaymentAdminReadRepository,
  PaymentStats,
  PaymentStatsRange,
} from '../../domain/ports/payment-admin-read.port'

/** Agregações de receita/contagens p/ os cards do painel. */
export class GetPaymentsStatsService {
  constructor(private readonly payments: PaymentAdminReadRepository) {}

  execute(range: PaymentStatsRange): Promise<PaymentStats> {
    return this.payments.stats(range)
  }
}
