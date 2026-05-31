import type { PaymentAggregate } from '../../domain/payment/payment.aggregate'
import type { PaymentStatus } from '../../domain/payment/payment.status'
import type { PaymentMethodType } from '../../domain/value-objects/payment-method'

/** Representação de leitura de um pagamento, exposta na API (sem dados sensíveis). */
export interface PaymentView {
  id: string
  consumerId: string
  status: PaymentStatus
  method: PaymentMethodType
  amountInCents: string
  currency: string
  description: string | null
  pix?: {
    txid: string
    copiaECola: string
    imagemQrcodeBase64?: string
    expiresAt: string | null
  }
  metadata: Record<string, unknown>
  createdAt: string
  paidAt: string | null
}

export function toPaymentView(payment: PaymentAggregate): PaymentView {
  const view: PaymentView = {
    id: payment.id,
    consumerId: payment.consumerId,
    status: payment.status,
    method: payment.method.type,
    amountInCents: payment.amount.amountInCents.toString(),
    currency: payment.amount.currency,
    description: payment.description,
    metadata: payment.metadata,
    createdAt: payment.createdAt.toISOString(),
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
  }

  const qr = payment.pixQrCode
  if (payment.method.type === 'PIX' && payment.txid && qr) {
    view.pix = {
      txid: payment.txid,
      copiaECola: qr.copiaECola,
      imagemQrcodeBase64: qr.imagemQrcodeBase64,
      expiresAt: payment.expiresAt ? payment.expiresAt.toISOString() : null,
    }
  }

  return view
}
