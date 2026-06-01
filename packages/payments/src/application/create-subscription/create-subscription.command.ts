import type { Address } from '../../domain/value-objects/customer'

/**
 * Comando de criação de assinatura (cartão). Como em `ProcessPaymentCommand`, os
 * dados chegam validados no formato na borda (TypeBox) e o domínio revalida as
 * invariantes. `requestHash` é o fingerprint do corpo (idempotência).
 */
export interface CreateSubscriptionCommand {
  consumerId: string
  idempotencyKey: string
  requestHash: string
  amountInCents: number
  /** Intervalo entre cobranças, em meses (≥ 1). */
  intervalMonths: number
  /** Total de cobranças; ausente/null = ilimitado. */
  repeats?: number | null
  description?: string
  customer?: {
    name: string
    email: string
    document: string
    phone?: string
    address?: Address
    /** Data de nascimento (YYYY-MM-DD), exigida pela Efí no cartão. */
    birth?: string
  }
  card?: {
    /** Token de pagamento gerado no browser (PCI) — de vida curta, usado 1x. */
    token: string
    brand: string
    last4: string
  }
  metadata?: Record<string, unknown>
}
