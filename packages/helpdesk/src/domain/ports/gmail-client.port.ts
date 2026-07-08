import type { AttachmentMeta } from '../ticket/ticket-message'

/** Perfil da caixa (users.getProfile) — o historyId semeia o sync incremental. */
export interface GmailProfile {
  emailAddress: string
  historyId: string
}

/** Página de ids de mensagens (users.messages.list). */
export interface GmailMessageIdsPage {
  ids: string[]
  nextPageToken: string | null
}

/**
 * Resultado de users.history.list. `expired: true` = 404 (o startHistoryId
 * saiu da janela de ~1 semana do Gmail) → o worker zera o lastHistoryId e o
 * próximo tick faz o full-resync (dedupe por gmail_message_id garante idempotência).
 */
export interface GmailHistoryPage {
  messageIds: string[]
  historyId: string | null
  nextPageToken: string | null
  expired: boolean
}

/**
 * E-mail já parseado (mime.ts) a partir de users.messages.get(format=full).
 * O corpo INTEIRO é preservado; o strip de citação é só para o prompt/colapso.
 */
export interface ParsedEmail {
  gmailMessageId: string
  gmailThreadId: string
  /** Header `Message-ID` (com `<>`) — base do In-Reply-To/References da resposta. */
  rfc822MessageId: string | null
  inReplyTo: string | null
  references: string[]
  fromEmail: string | null
  fromName: string | null
  toEmails: string[]
  ccEmails: string[]
  subject: string
  bodyText: string
  bodyHtml: string | null
  snippet: string | null
  attachments: AttachmentMeta[]
  internalDate: Date | null
  labelIds: string[]
  /** Headers de anti-loop (autoresponder): auto-resposta nunca responde a estes. */
  autoSubmitted: string | null
  listUnsubscribe: string | null
  isAutoreply: boolean
}

/** Resultado de users.messages.send (o id volta p/ o dedupe do poller). */
export interface SentMessage {
  id: string
  threadId: string
}

/**
 * Porta do cliente da Gmail API (REST v1, fetch nativo). O accessToken é passado
 * por chamada (o worker refaz o token fresco a cada tick). Erros inesperados
 * lançam `GmailApiError`; o 404 do history vira `expired` e o 404 do get vira null.
 */
export interface GmailClient {
  getProfile(accessToken: string): Promise<GmailProfile>
  /** users.messages.list (backfill inicial por query, ex. `newer_than:7d`). */
  listMessages(
    accessToken: string,
    input: { q?: string; pageToken?: string; maxResults?: number },
  ): Promise<GmailMessageIdsPage>
  /** users.history.list (sync incremental a partir do lastHistoryId). */
  listHistory(
    accessToken: string,
    input: { startHistoryId: string; pageToken?: string; maxResults?: number },
  ): Promise<GmailHistoryPage>
  /** users.messages.get(format=full) já parseado; null se a mensagem sumiu (404). */
  getMessage(accessToken: string, id: string): Promise<ParsedEmail | null>
  /** users.messages.send: `raw` base64url + `threadId` (mantém a conversa). */
  sendMessage(accessToken: string, input: { raw: string; threadId: string }): Promise<SentMessage>
}

/** Erro da Gmail API. `permanent` (401/403 auth) sinaliza reauth; o resto é transitório. */
export class GmailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly permanent: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'GmailApiError'
  }
}
