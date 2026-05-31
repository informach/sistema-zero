import type { Address } from '../../domain/value-objects/customer'
import type { PaymentMethodType } from '../../domain/value-objects/payment-method'

/**
 * Comando de entrada do caso de uso. Os dados já vêm validados quanto ao formato
 * na borda (Zod); aqui o domínio ainda revalida as invariantes ao construir os
 * value objects. `requestHash` é o fingerprint do corpo, calculado na borda a
 * partir do payload bruto, e usado pela idempotência.
 */
export interface ProcessPaymentCommand {
  consumerId: string
  idempotencyKey: string
  requestHash: string
  amountInCents: number
  method: PaymentMethodType
  description?: string
  payerMessage?: string
  expiresInSeconds?: number
  customer?: {
    name: string
    email: string
    document: string
    phone?: string
    address?: Address
  }
  card?: {
    token: string
    brand: string
    last4: string
    installments: number
  }
  metadata?: Record<string, unknown>
}
