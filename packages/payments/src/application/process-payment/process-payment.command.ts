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
  /** Parâmetros específicos de boleto (API Cobranças). */
  boleto?: {
    /** Vencimento explícito (YYYY-MM-DD); tem prioridade sobre `expiresInDays`. */
    dueDate?: string
    /** Dias até o vencimento (default: EFI_BOLETO_DEFAULT_EXPIRES_DAYS). */
    expiresInDays?: number
    /** Multa (% em centavos). */
    fine?: number
    /** Juros ao mês (% em centavos). */
    interest?: number
    discount?: number
    message?: string
    daysToWriteOff?: number
  }
  metadata?: Record<string, unknown>
}
