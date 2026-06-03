import type {
  PaymentAdminReadRepository,
  PaymentOpsSnapshot,
} from '../../domain/ports/payment-admin-read.port'

/** Saúde das filas (outbox/entregas/reconciliação) p/ a aba de Operações. */
export class GetPaymentsOpsService {
  constructor(private readonly payments: PaymentAdminReadRepository) {}

  execute(): Promise<PaymentOpsSnapshot> {
    return this.payments.ops()
  }
}
