/**
 * Estados de um pagamento e as transições permitidas (máquina de estados).
 *
 * Fluxo Pix:    PENDING ──▶ PAID | EXPIRED
 * Fluxo Cartão: PENDING ──▶ AUTHORIZED ──▶ PAID | FAILED
 * Estorno:      PAID ──▶ REFUNDED
 */
export const PaymentStatus = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  CANCELED: 'CANCELED',
  REFUNDED: 'REFUNDED',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

const TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  PENDING: ['AUTHORIZED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED'],
  AUTHORIZED: ['PAID', 'FAILED', 'CANCELED'],
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
