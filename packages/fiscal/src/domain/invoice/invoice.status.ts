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

// As transições válidas são GUARDADAS no repositório (UPDATE condicionado ao
// status de origem em `transition()`/`markEmittedAsSubstitute()`/etc.), incluindo
// a exceção de reconciliação SKIPPED→CANCEL_PENDING. Um mapa estático aqui
// duplicaria essa verdade e divergiria dela (era dead code enganoso) — removido.

/** Motivos de SKIPPED (nota que nunca será emitida). */
export const SkipReason = {
  REFUNDED_BEFORE_EMISSION: 'REFUNDED_BEFORE_EMISSION',
  PAYMENT_NOT_PAID_AT_EMISSION: 'PAYMENT_NOT_PAID_AT_EMISSION',
} as const
export type SkipReason = (typeof SkipReason)[keyof typeof SkipReason]
