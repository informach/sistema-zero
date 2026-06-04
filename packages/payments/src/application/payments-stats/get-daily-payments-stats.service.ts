import type {
  PaymentAdminReadRepository,
  PaymentDailyRange,
  PaymentDailyStats,
} from '../../domain/ports/payment-admin-read.port'

/** Série diária (faturamento líquido/transações/estornos) p/ o painel "Gestão de vendas". */
export class GetDailyPaymentsStatsService {
  constructor(private readonly payments: PaymentAdminReadRepository) {}

  execute(range: PaymentDailyRange): Promise<PaymentDailyStats> {
    return this.payments.statsDaily(range)
  }
}
