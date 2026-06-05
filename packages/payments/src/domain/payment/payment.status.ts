/**
 * Estados de um pagamento e as transições permitidas (máquina de estados).
 *
 * Fluxo Pix/boleto: PENDING ──▶ PAID | EXPIRED
 * Fluxo Cartão:     PENDING ──▶ PAID | FAILED (one-step da Efí: sem etapa de
 *                   pré-autorização separada — `approved` vira PAID direto)
 * Estorno:          PAID ──▶ REFUNDED
 *
 * Nota: o enum `payment_status` do BANCO ainda contém um valor legado
 * `AUTHORIZED` (nunca escrito por nenhum writer); removê-lo do Postgres exigiria
 * recriar o tipo — sem valor prático. Aqui no domínio ele não existe mais.
 */
export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  CANCELED: 'CANCELED',
  REFUNDED: 'REFUNDED',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

const TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  PENDING: ['PAID', 'FAILED', 'EXPIRED', 'CANCELED'],
  PAID: ['REFUNDED'],
  FAILED: [],
  EXPIRED: [],
  CANCELED: [],
  REFUNDED: [],
}

export const TERMINAL_STATUSES: readonly PaymentStatus[] = [
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
]

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function isTerminal(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}
