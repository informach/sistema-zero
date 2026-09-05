import type { GmailConnection } from '../domain/connection/gmail-connection'
import type { KbArticle } from '../domain/kb/kb-article'
import type { HelpdeskSettings } from '../domain/settings/settings'
import type { Ticket } from '../domain/ticket/ticket'
import type { TicketMessage } from '../domain/ticket/ticket-message'
import { ticketSla } from '../domain/ticket/ticket-sla'

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null)

export function toTicketView(ticket: Ticket, now?: Date) {
  const sla = now ? ticketSla(ticket, now) : null
  return {
    id: ticket.id,
    version: ticket.version,
    source: ticket.source,
    subject: ticket.subject,
    status: ticket.status,
    category: ticket.category,
    categoryManual: ticket.categoryManual,
    priority: ticket.priority,
    requesterName: ticket.requesterName,
    requesterEmail: ticket.requesterEmail,
    assignedTo: ticket.assignedTo,
    assignedToName: ticket.assignedToName,
    firstMessageAt: ticket.firstMessageAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    lastInboundAt: iso(ticket.lastInboundAt),
    messageCount: ticket.messageCount,
    aiSummary: ticket.aiSummary,
    aiSummaryAt: iso(ticket.aiSummaryAt),
    aiDraft: ticket.aiDraft,
    aiDraftAt: iso(ticket.aiDraftAt),
    aiDraftEdited: ticket.aiDraftEdited,
    aiClassification: ticket.aiClassification,
    aiStatus: ticket.aiStatus,
    sla: sla
      ? {
          state: sla.state,
          priority: sla.priority,
          targetMinutes: sla.targetMinutes,
          deadlineAt: sla.deadlineAt.toISOString(),
          remainingMinutes: sla.remainingMinutes,
        }
      : null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  }
}
export type TicketView = ReturnType<typeof toTicketView>

export function toMessageView(message: TicketMessage) {
  return {
    id: message.id,
    ticketId: message.ticketId,
    kind: message.kind,
    visibility: message.visibility,
    direction: message.direction,
    sentVia: message.sentVia,
    deliveryState: message.deliveryState,
    deliveryLastError: message.deliveryLastError,
    fromEmail: message.fromEmail,
    fromName: message.fromName,
    toEmails: message.toEmails,
    ccEmails: message.ccEmails,
    subject: message.subject,
    bodyText: message.bodyText,
    bodyHtml: message.bodyHtml,
    snippet: message.snippet,
    attachments: message.attachments,
    gmailInternalDate: iso(message.gmailInternalDate),
    createdBy: message.createdBy,
    createdByName: message.createdByName,
    createdAt: message.createdAt.toISOString(),
  }
}
export type MessageView = ReturnType<typeof toMessageView>

/**
 * Projeção do PORTAL do cliente. Deliberadamente estreita: o `toTicketView` é a
 * ficha da EQUIPE e carrega coisa que o cliente não pode ver — o rascunho da IA
 * (uma resposta que humano nenhum aprovou), o resumo e a classificação
 * (confiança, sentimento, flags), o responsável interno, a prioridade e o SLA.
 * ⚠️ O repositório do portal faz `select()` sem projeção, então o filtro tem que
 * ser AQUI; e o BFF do member-shell repassa o corpo verbatim, então o que entra
 * nesta função é exatamente o que chega ao navegador do cliente. A forma espelha
 * `CustomerTicketView` do member-shell, que é o contrato do único consumidor.
 */
export function toCustomerTicketView(ticket: Ticket) {
  return {
    id: ticket.id,
    version: ticket.version,
    source: ticket.source,
    subject: ticket.subject,
    status: ticket.status,
    category: ticket.category,
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    messageCount: ticket.messageCount,
    createdAt: ticket.createdAt.toISOString(),
  }
}
export type CustomerTicketView = ReturnType<typeof toCustomerTicketView>

/**
 * Mensagem como o cliente a vê. Fora ficam os campos de bastidor: `sentVia`,
 * `deliveryState`/`deliveryLastError` (texto de erro interno), o `createdBy` da
 * equipe, os cabeçalhos de e-mail e o `gmailInternalDate`. A visibilidade
 * `internal` já é barrada antes, no service — esta função é a segunda tranca.
 */
export function toCustomerMessageView(message: TicketMessage) {
  return {
    id: message.id,
    ticketId: message.ticketId,
    kind: message.kind,
    visibility: message.visibility,
    direction: message.direction,
    fromName: message.fromName,
    bodyText: message.bodyText,
    createdAt: message.createdAt.toISOString(),
  }
}
export type CustomerMessageView = ReturnType<typeof toCustomerMessageView>

export function toKbArticleView(article: KbArticle) {
  return {
    id: article.id,
    version: article.version,
    title: article.title,
    content: article.content,
    published: article.published,
    createdBy: article.createdBy,
    createdByName: article.createdByName,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }
}
export type KbArticleView = ReturnType<typeof toKbArticleView>

export function toSettingsView(settings: HelpdeskSettings) {
  return {
    signature: settings.signature,
    updatedAt: iso(settings.updatedAt),
  }
}
export type SettingsView = ReturnType<typeof toSettingsView>

/** NUNCA expõe `*_enc` (tokens cifrados ficam no banco e na memória do serviço). */
export function toConnectionView(connection: GmailConnection | null) {
  if (!connection || connection.status === 'revoked' || connection.status === 'disabled') {
    return { connected: false as const }
  }
  return {
    connected: true as const,
    emailAddress: connection.emailAddress,
    status: connection.status,
    lastSyncAt: iso(connection.lastSyncAt),
    lastSyncError: connection.lastSyncError,
    connectedAt: connection.createdAt.toISOString(),
  }
}
export type ConnectionView = ReturnType<typeof toConnectionView>
