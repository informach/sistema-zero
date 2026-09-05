import { CustomerTicketCursorInvalidError, TicketNotFoundError } from '../../domain/helpdesk-errors'
import type {
  CustomerTicketOwner,
  CustomerTicketRepository,
} from '../../domain/ports/customer-ticket-repository.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { TicketCategory, TicketPortal, TicketStatus } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'
import {
  type CustomerMessageView,
  type CustomerTicketView,
  toCustomerMessageView,
  toCustomerTicketView,
} from '../views'
import { decodeCustomerTicketCursor, encodeCustomerTicketCursor } from './customer-ticket-cursor'

export interface CustomerRequester extends CustomerTicketOwner {
  name: string | null
}

export interface CreateCustomerTicketInput {
  subject: string
  body: string
  category?: TicketCategory
  /** Qual app abriu o chamado — vem do BFF (config do app), nunca do cliente. */
  portal?: TicketPortal
}

export interface CustomerTicketListInput {
  status?: TicketStatus
  limit: number
  cursor?: string
}

/** Casos de uso do portal: uma conta só enxerga e escreve os próprios tickets. */
export class CustomerTicketService {
  constructor(
    private readonly tickets: CustomerTicketRepository,
    private readonly messages: MessageRepository,
    private readonly config: { aiEnabled: boolean },
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  async list(
    requester: CustomerRequester,
    input: CustomerTicketListInput,
  ): Promise<{
    items: CustomerTicketView[]
    total: number
    hasMore: boolean
    nextCursor: string | null
  }> {
    const cursor = decodeCustomerTicketCursor(input.cursor)
    if (input.cursor !== undefined && !cursor) throw new CustomerTicketCursorInvalidError()
    const page = await this.tickets.listOwned({
      ...input,
      cursor,
      accountId: requester.accountId,
      email: requester.email,
    })
    const items = page.items.slice(0, input.limit)
    const last = items.at(-1)
    const hasMore = page.items.length > input.limit
    return {
      items: items.map(toCustomerTicketView),
      total: page.total,
      hasMore,
      nextCursor: hasMore && last ? encodeCustomerTicketCursor(last) : null,
    }
  }

  async byId(
    requester: CustomerRequester,
    id: string,
  ): Promise<{ ticket: CustomerTicketView; messages: CustomerMessageView[] }> {
    const ticket = await this.requireOwnedTicket(requester, id)
    const messages = await this.messages.byTicketId(ticket.id)
    return {
      ticket: toCustomerTicketView(ticket),
      messages: messages
        .filter((message) => message.visibility === 'customer')
        .map(toCustomerMessageView),
    }
  }

  async create(
    requester: CustomerRequester,
    input: CreateCustomerTicketInput,
  ): Promise<{ ticket: CustomerTicketView; message: CustomerMessageView }> {
    const at = this.now()
    const ticketId = this.idGen()
    const subject = input.subject.trim()
    const body = input.body.trim()
    const ticket = {
      id: ticketId,
      version: 0,
      gmailThreadId: null,
      source: 'portal' as const,
      portal: input.portal ?? null,
      subject,
      status: 'new' as const,
      resolvedAt: null,
      category: input.category ?? null,
      categoryManual: input.category !== undefined,
      priority: null,
      requesterName: requester.name,
      requesterEmail: requester.email,
      requesterAccountId: requester.accountId,
      assignedTo: null,
      assignedToName: null,
      firstMessageAt: at,
      lastMessageAt: at,
      lastInboundAt: at,
      messageCount: 1,
      aiSummary: null,
      aiSummaryAt: null,
      aiDraft: null,
      aiDraftAt: null,
      aiDraftEdited: false,
      aiClassification: null,
      aiGeneration: 1,
      aiStatus: this.config.aiEnabled ? ('pending' as const) : ('skipped' as const),
      aiNextAttemptAt: this.config.aiEnabled ? at : null,
      aiAttempts: 0,
      aiLastError: null,
      createdAt: at,
      updatedAt: at,
    }
    const message = this.customerMessage({ ticketId, body, requester, subject, at })
    await this.tickets.createWithInitialMessage({ ticket, message })
    return { ticket: toCustomerTicketView(ticket), message: toCustomerMessageView(message) }
  }

  async addMessage(
    requester: CustomerRequester,
    ticketId: string,
    body: string,
  ): Promise<{ ticket: CustomerTicketView; message: CustomerMessageView }> {
    const ticket = await this.requireOwnedTicket(requester, ticketId)
    const at = this.now()
    const message = this.customerMessage({
      ticketId: ticket.id,
      body: body.trim(),
      requester,
      subject: ticket.subject,
      at,
    })
    const appended = await this.tickets.appendCustomerMessage({
      ticketId: ticket.id,
      owner: requester,
      message,
      at,
      aiEnabled: this.config.aiEnabled,
    })
    if (!appended) throw new TicketNotFoundError()
    return {
      ticket: toCustomerTicketView(appended.ticket),
      message: toCustomerMessageView(appended.message),
    }
  }

  private async requireOwnedTicket(requester: CustomerTicketOwner, id: string) {
    const ticket = await this.tickets.byIdOwned(id, requester)
    if (!ticket) throw new TicketNotFoundError()
    return ticket
  }

  private customerMessage(input: {
    ticketId: string
    body: string
    requester: CustomerRequester
    subject: string
    at: Date
  }): TicketMessage {
    return {
      id: this.idGen(),
      ticketId: input.ticketId,
      kind: 'portal',
      visibility: 'customer',
      gmailMessageId: null,
      rfc822MessageId: null,
      deliveryState: null,
      deliveryLastError: null,
      direction: 'inbound',
      sentVia: 'customer',
      fromEmail: input.requester.email,
      fromName: input.requester.name,
      toEmails: ['contato@sistemazero.com.br'],
      ccEmails: [],
      subject: input.subject,
      bodyText: input.body,
      bodyHtml: null,
      snippet: input.body.slice(0, 500),
      attachments: [],
      isAutoreply: false,
      gmailInternalDate: null,
      createdBy: null,
      createdByName: null,
      createdAt: input.at,
    }
  }
}
