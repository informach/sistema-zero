import {
  PaymentNotFoundError,
  PaymentNotRefundableError,
  RefundInProgressError,
  RefundNotSupportedError,
} from '../../domain/payment/payment.errors'
import type { PaymentGateway, RefundResult } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { Logger } from '../../infrastructure/logging/logger'
import { ConcurrencyConflictError } from '../../infrastructure/persistence/drizzle/concurrency.error'
import { type AdminPaymentView, toAdminPaymentView } from '../mappers/admin-payment-view'

/**
 * Caso de uso de ESTORNO (admin, cross-consumer). Estorna um pagamento PAID via
 * Pix (devolução) ou cartão (refund), marca REFUNDED e emite `payment.refunded`
 * (outbox → entrega ao consumidor p/ revogar acesso). Boleto não tem estorno
 * programático na Efí → erro claro. **Idempotente**: já REFUNDED → no-op.
 *
 * ⚠️ O refund de CARTÃO **não é idempotente** na Efí (`POST /v1/charge/card/
 * :id/refund` — a doc oficial admite devolução duplicada em chamadas repetidas).
 * Por isso o serviço faz um **claim otimista** (save que incrementa a `version`)
 * ANTES de tocar o provedor: dois estornos concorrentes disputam o UPDATE e só o
 * vencedor chama a Efí — o perdedor recebe 409 `REFUND_IN_PROGRESS` (ou a view
 * atual, se o vencedor já concluiu). Pix é idempotente no provedor (id de
 * devolução determinístico), mas o claim unifica o caminho.
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

    // Valida método/dados ANTES do claim — um estorno impossível (boleto, dados
    // faltando) não deve gastar um bump de versão.
    const method = payment.method.type
    let doRefund: () => Promise<RefundResult>
    if (method === 'PIX') {
      const txid = payment.txid
      if (!txid) throw new RefundNotSupportedError('Pix sem txid')
      doRefund = () => this.gateway.refundPixCharge({ txid, amount: payment.amount })
    } else if (method === 'CREDIT_CARD') {
      const chargeId = payment.providerPaymentId
      if (!chargeId) throw new RefundNotSupportedError('cartão sem charge_id')
      doRefund = () => this.gateway.refundCardCharge(chargeId, payment.amount)
    } else {
      throw new RefundNotSupportedError(`método ${method} (boleto não tem estorno programático)`)
    }

    // Claim otimista: serializa estornos concorrentes ANTES da chamada externa.
    try {
      await this.payments.save(payment)
    } catch (error) {
      if (error instanceof ConcurrencyConflictError) return this.resolveRace(id)
      throw error
    }

    const result = await doRefund()

    // O claim incrementou a version no banco, mas a instância em memória ficou
    // defasada (o `save` não a atualiza) → recarrega antes de marcar REFUNDED.
    const claimed = await this.payments.findById(id)
    if (!claimed) throw new PaymentNotFoundError(id)
    if (claimed.status === 'REFUNDED') return toAdminPaymentView(claimed)

    claimed.refund({ providerRefundId: result.providerRefundId, refundedAt: new Date() })
    try {
      await this.payments.save(claimed)
    } catch (error) {
      // Corrida residual entre o claim e este save (raro): se o outro writer já
      // marcou REFUNDED, é o no-op idempotente; senão propaga.
      if (error instanceof ConcurrencyConflictError) return this.resolveRace(id)
      throw error
    }
    this.logger.info('payment.refunded', {
      paymentId: id,
      method,
      providerRefundId: result.providerRefundId,
      providerStatus: result.status,
    })
    return toAdminPaymentView(claimed)
  }

  /**
   * Perdeu a corrida do claim/save: recarrega e decide — se o vencedor já marcou
   * REFUNDED, devolve a view (idempotente); senão o estorno do vencedor ainda
   * está em andamento → 409 (o operador recarrega em vez de estornar em dobro).
   */
  private async resolveRace(id: string): Promise<AdminPaymentView> {
    const reloaded = await this.payments.findById(id)
    if (!reloaded) throw new PaymentNotFoundError(id)
    if (reloaded.status === 'REFUNDED') return toAdminPaymentView(reloaded)
    throw new RefundInProgressError()
  }
}
