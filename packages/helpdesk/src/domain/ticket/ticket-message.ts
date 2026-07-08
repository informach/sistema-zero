export type MessageKind = 'email' | 'note'
export type MessageDirection = 'inbound' | 'outbound'
/**
 * Quem produziu o e-mail: `customer` (inbound), `human` (resposta pelo app),
 * `ai` (auto-resposta) ou `gmail` (resposta dada direto na caixa do Gmail,
 * detectada pelo poller).
 */
export type MessageSentVia = 'customer' | 'human' | 'ai' | 'gmail'

/** SÓ metadados — os bytes ficam no Gmail (download sob demanda é fase futura). */
export interface AttachmentMeta {
  filename: string
  mimeType: string
  sizeBytes: number
  gmailAttachmentId: string
}

export interface TicketMessage {
  id: string
  ticketId: string
  kind: MessageKind
  /** Dedupe forte da ingestão (unique; null em notas internas). */
  gmailMessageId: string | null
  /** Header `Message-ID` RFC 2822 — base do In-Reply-To/References da resposta. */
  rfc822MessageId: string | null
  direction: MessageDirection | null
  sentVia: MessageSentVia | null
  fromEmail: string | null
  fromName: string | null
  toEmails: string[]
  ccEmails: string[]
  subject: string | null
  bodyText: string
  bodyHtml: string | null
  snippet: string | null
  attachments: AttachmentMeta[]
  gmailInternalDate: Date | null
  createdBy: string | null
  createdByName: string | null
  createdAt: Date
}
