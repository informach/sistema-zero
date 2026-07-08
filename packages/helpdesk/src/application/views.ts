import type { GmailConnection } from '../domain/connection/gmail-connection'
import type { KbArticle } from '../domain/kb/kb-article'
import type { HelpdeskSettings } from '../domain/settings/settings'
import type { Ticket } from '../domain/ticket/ticket'
import type { TicketMessage } from '../domain/ticket/ticket-message'

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null)

export function toTicketView(ticket: Ticket) {
  return {
    id: ticket.id,
    version: ticket.version,
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
    autoReplyState: ticket.autoReplyState,
    autoRepliedAt: iso(ticket.autoRepliedAt),
    autoReplyReason: ticket.autoReplyReason,
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
    direction: message.direction,
    sentVia: message.sentVia,
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
    autoReplyEnabled: settings.autoReplyEnabled,
    autoReplyCategories: settings.autoReplyCategories,
    autoReplyConfidenceMin: settings.autoReplyConfidenceMin,
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
