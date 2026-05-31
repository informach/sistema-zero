import type { PaymentAggregate } from '../../domain/payment/payment.aggregate'
import { BoletoDataIncompleteError } from '../../domain/payment/payment.errors'
import type { CreateBoletoChargeInput } from '../../domain/ports/payment-gateway.port'

/**
 * Constrói o input do gateway de boleto a partir do agregado persistido. Usado
 * tanto na criação **síncrona** (ProcessPaymentService) quanto na **assíncrona**
 * (ChargeCreationWorker) — fonte única, evita divergência entre os dois caminhos.
 *
 * Lança `BoletoDataIncompleteError` se faltar pagador/endereço/params (não
 * deveria acontecer: validamos no momento da requisição antes de aceitar).
 */
export function buildBoletoChargeInput(payment: PaymentAggregate): CreateBoletoChargeInput {
  const customer = payment.customer
  if (!customer) throw new BoletoDataIncompleteError('customer')
  const address = customer.address
  if (!customer.phone) throw new BoletoDataIncompleteError('customer.phone')
  if (!address) throw new BoletoDataIncompleteError('customer.address')
  const boletoRequest = payment.boletoRequest
  if (!boletoRequest) throw new BoletoDataIncompleteError('boletoRequest')

  return {
    paymentId: payment.id,
    amount: payment.amount,
    customer: {
      name: customer.name,
      cpfOrCnpj: customer.document.value,
      email: customer.email,
      phone: customer.phone,
      address,
    },
    expireAt: boletoRequest.dueDate,
    fine: boletoRequest.fine,
    interest: boletoRequest.interest,
    discount: boletoRequest.discount,
    message: boletoRequest.message,
    daysToWriteOff: boletoRequest.daysToWriteOff,
    idempotencyKey: payment.idempotencyKey,
  }
}
