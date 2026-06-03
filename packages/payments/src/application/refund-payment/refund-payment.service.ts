import {
  PaymentNotFoundError,
  PaymentNotRefundableError,
  RefundNotSupportedError,
} from '../../domain/payment/payment.errors'
import type { PaymentGateway, RefundResult } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { Logger } from '../../infrastructure/logging/logger'
import { type AdminPaymentView, toAdminPaymentView } from '../mappers/admin-payment-view'

/**
 * Caso de uso de ESTORNO (admin, cross-consumer). Estorna um pagamento PAID via
 * Pix (devolução) ou cartão (refund), marca REFUNDED e emite `payment.refunded`
 * (outbox → entrega ao consumidor p/ revogar acesso). Boleto não tem estorno
 * programático na Efí → erro claro. **Idempotente**: já REFUNDED → no-op.
 */
export class RefundPaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly logger: Logger,
  ) {}

  async execute(id: string): Promise<AdminPaymentView> {
    const payment = await this.payments.findById(id)
    if (!payment) throw new PaymentNotFoundError(id)
    // Já estornado → devolve a view atual sem chamar o provedor de novo.
    if (payment.status === 'REFUNDED') return toAdminPaymentView(payment)
    if (payment.status !== 'PAID') throw new PaymentNotRefundableError(payment.status)

    const method = payment.method.type
    let result: RefundResult
    if (method === 'PIX') {
      if (!payment.txid) throw new RefundNotSupportedError('Pix sem txid')
      result = await this.gateway.refundPixCharge({ txid: payment.txid, amount: payment.amount })
    } else if (method === 'CREDIT_CARD') {
      if (!payment.providerPaymentId) throw new RefundNotSupportedError('cartão sem charge_id')
      result = await this.gateway.refundCardCharge(payment.providerPaymentId, payment.amount)
    } else {
      throw new RefundNotSupportedError(`método ${method} (boleto não tem estorno programático)`)
    }

    payment.refund({ providerRefundId: result.providerRefundId, refundedAt: new Date() })
    await this.payments.save(payment)
    this.logger.info('payment.refunded', {
      paymentId: id,
      method,
      providerRefundId: result.providerRefundId,
      providerStatus: result.status,
    })
    return toAdminPaymentView(payment)
  }
}
