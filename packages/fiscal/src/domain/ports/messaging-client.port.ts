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
  /**
   * Retorna `true` se o e-mail foi DESPACHADO (cliente real, 2xx do gateway);
   * `false` se o cliente é no-op (sem GATEWAY_URL/FISCAL_HMAC_SECRET) — assim o
   * `emailSentAt` NÃO é marcado num envio que nunca aconteceu (admin não vê
   * "enviado" fantasma). Lança em FALHA real (chamador trata como best-effort).
   */
  sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<boolean>
}
