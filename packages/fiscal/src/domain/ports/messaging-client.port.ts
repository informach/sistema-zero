export interface SendInvoiceEmailInput {
  /** Dedupe no messaging (Idempotency-Key) — `nfse-<invoiceId>`. */
  idempotencyKey: string
  /** Contrato do messaging: recipient é OBJETO {name, email}. */
  recipient: { name: string; email: string }
  variables: Record<string, string>
  /** Anexo por URL — o messaging busca os bytes no envio (capability-URL nossa). */
  attachments: Array<{ filename: string; url: string; contentType?: string }>
}

export interface MessagingClient {
  /** Lança em falha (chamador decide se é best-effort). */
  sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<void>
}
