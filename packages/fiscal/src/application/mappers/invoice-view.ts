import type { Invoice, InvoiceEventRow } from '../../domain/ports/invoice-repository.port'

/** View JSON-safe da nota (bigint → string, Date → ISO) — contrato do admin. */
export interface InvoiceView {
  id: string
  paymentId: string
  status: Invoice['status']
  customer: { name: string; email: string; document: string }
  amountInCents: string
  serviceDescription: string
  guaranteeDays: number | null
  paidAt: string
  scheduledFor: string
  attempts: number
  lastError: string | null
  skipReason: string | null
  dpsSeries: string | null
  dpsNumber: string | null
  accessKey: string | null
  competenceDate: string | null
  ambiente: string
  emittedAt: string | null
  cancelReason: string | null
  cancelRequestedBy: string | null
  cancelledAt: string | null
  substitutesId: string | null
  substitutedById: string | null
  pdfStoredAt: string | null
  emailSentAt: string | null
  createdAt: string
}

export function toInvoiceView(invoice: Invoice): InvoiceView {
  return {
    id: invoice.id,
    paymentId: invoice.paymentId,
    status: invoice.status,
    customer: invoice.customer,
    amountInCents: invoice.amountInCents.toString(),
    serviceDescription: invoice.serviceDescription,
    guaranteeDays: invoice.guaranteeDays,
    paidAt: invoice.paidAt.toISOString(),
    scheduledFor: invoice.scheduledFor.toISOString(),
    attempts: invoice.attempts,
    lastError: invoice.lastError,
    skipReason: invoice.skipReason,
    dpsSeries: invoice.dpsSeries,
    dpsNumber: invoice.dpsNumber?.toString() ?? null,
    accessKey: invoice.accessKey,
    competenceDate: invoice.competenceDate,
    ambiente: invoice.ambiente,
    emittedAt: invoice.emittedAt?.toISOString() ?? null,
    cancelReason: invoice.cancelReason,
    cancelRequestedBy: invoice.cancelRequestedBy,
    cancelledAt: invoice.cancelledAt?.toISOString() ?? null,
    substitutesId: invoice.substitutesId,
    substitutedById: invoice.substitutedById,
    pdfStoredAt: invoice.pdfStoredAt?.toISOString() ?? null,
    emailSentAt: invoice.emailSentAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
  }
}

export interface InvoiceEventView {
  id: string
  type: string
  actor: string | null
  detail: Record<string, unknown>
  createdAt: string
}

export function toInvoiceEventView(event: InvoiceEventRow): InvoiceEventView {
  return { ...event, createdAt: event.createdAt.toISOString() }
}
