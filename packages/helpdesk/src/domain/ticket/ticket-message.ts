export type MessageKind = 'email' | 'note' | 'portal'
export type MessageDirection = 'inbound' | 'outbound'
/** Notas são exclusivas da equipe; e-mails e mensagens do portal são do cliente. */
export type MessageVisibility = 'customer' | 'internal'
/**
 * Quem produziu o e-mail: `customer` (inbound), `human` (resposta pelo app)
 * ou `gmail` (resposta dada direto na caixa). `ai` só permanece para leitura
 * de registros históricos, pois o produto não envia respostas automáticas.
 */
export type MessageSentVia = 'customer' | 'human' | 'ai' | 'gmail'
/** Outbound humano é persistido antes do side-effect Gmail. */
export type MessageDeliveryState = 'pending' | 'sent' | 'unknown' | 'failed'

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
  visibility: MessageVisibility
  /** Dedupe forte da ingestão (unique; null em notas internas). */
  gmailMessageId: string | null
  /** Header `Message-ID` RFC 2822 — base do In-Reply-To/References da resposta. */
  rfc822MessageId: string | null
  /** Null em notas; e-mail importado ou confirmado pelo Gmail é `sent`. */
  deliveryState: MessageDeliveryState | null
  /** Erro sanitizado de envio/reconciliação; nunca contém token ou corpo. */
  deliveryLastError: string | null
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
  /** Inbound parece resposta automática (autoresponder/newsletter), para contexto da equipe. */
  isAutoreply: boolean
  gmailInternalDate: Date | null
  createdBy: string | null
  createdByName: string | null
  createdAt: Date
}
