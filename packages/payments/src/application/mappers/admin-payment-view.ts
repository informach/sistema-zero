import type { PaymentAggregate } from '../../domain/payment/payment.aggregate'
import { type PaymentView, toPaymentView } from './payment-view'

/**
 * View de leitura admin de um pagamento: a `PaymentView` pública + campos que só
 * o painel precisa (cliente, identificadores do provedor, motivo de falha, datas
 * de atualização/expiração e dados do estorno). Continua SEM dados sensíveis de
 * cartão (herda a omissão da `PaymentView`).
 */
export interface AdminPaymentView extends PaymentView {
  version: number
  provider: string
  providerPaymentId: string | null
  txid: string | null
  failureReason: string | null
  /** Assinatura-pai quando é um ciclo recorrente. */
  subscriptionId: string | null
  expiresAt: string | null
  updatedAt: string
  customer: { name: string; email: string; document: string; phone: string | null } | null
  /** Estorno (guardado em `metadata` — sem migração de schema). */
  refundedAt: string | null
  providerRefundId: string | null
}

export function toAdminPaymentView(payment: PaymentAggregate): AdminPaymentView {
  const snap = payment.toSnapshot()
  const meta = snap.metadata
  return {
    ...toPaymentView(payment),
    version: snap.version,
    provider: snap.provider,
    providerPaymentId: snap.providerPaymentId,
    txid: snap.txid,
    failureReason: snap.failureReason,
    subscriptionId: snap.subscriptionId,
    expiresAt: snap.expiresAt ? snap.expiresAt.toISOString() : null,
    updatedAt: snap.updatedAt.toISOString(),
    customer: snap.customer
      ? {
          name: snap.customer.name,
          email: snap.customer.email,
          document: snap.customer.document,
          phone: snap.customer.phone ?? null,
        }
      : null,
    refundedAt: typeof meta.refundedAt === 'string' ? meta.refundedAt : null,
    providerRefundId: typeof meta.providerRefundId === 'string' ? meta.providerRefundId : null,
  }
}
