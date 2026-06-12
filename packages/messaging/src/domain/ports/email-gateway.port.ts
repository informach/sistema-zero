/** Anexo "de verdade" (disposition attachment) — ex.: DANFSe em PDF. */
export interface EmailAttachment {
  filename: string
  contentType: string
  contentBase64: string
}

export interface SendEmailInput {
  to: string
  toName: string | null
  subject: string
  /** Corpo HTML já renderizado (valores das variáveis escapados). */
  html: string
  from: string
  fromName: string
  replyTo: string | null
  /** Anexos já materializados (o worker buscou os bytes por URL antes do envio). */
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  /** Id atribuído pelo provedor (para casar com o webhook de status). */
  providerMessageId: string | null
}

/**
 * Port (anti-corrupção) de envio de e-mail. O adapter (SendGrid) traduz para a
 * API do provedor. Em falha lança `ProviderSendError` (permanent = não re-tentar).
 */
export interface EmailGateway {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>
}
