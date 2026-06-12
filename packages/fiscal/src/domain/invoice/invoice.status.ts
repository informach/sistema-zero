/** Estados da nota e transições válidas (espelha payment.status.ts do payments). */
export const InvoiceStatus = {
  SCHEDULED: 'SCHEDULED',
  EMITTED: 'EMITTED',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED',
  CANCEL_PENDING: 'CANCEL_PENDING',
  CANCELLED: 'CANCELLED',
  SUBSTITUTED: 'SUBSTITUTED',
} as const

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  SCHEDULED: ['EMITTED', 'SKIPPED', 'FAILED'],
  EMITTED: ['CANCEL_PENDING', 'SUBSTITUTED'],
  SKIPPED: [],
  // Admin reprocessa uma FAILED → volta à fila.
  FAILED: ['SCHEDULED'],
  CANCEL_PENDING: ['CANCELLED'],
  CANCELLED: [],
  SUBSTITUTED: [],
}

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Motivos de SKIPPED (nota que nunca será emitida). */
export const SkipReason = {
  REFUNDED_BEFORE_EMISSION: 'REFUNDED_BEFORE_EMISSION',
  PAYMENT_NOT_PAID_AT_EMISSION: 'PAYMENT_NOT_PAID_AT_EMISSION',
} as const
export type SkipReason = (typeof SkipReason)[keyof typeof SkipReason]
