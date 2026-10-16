import type { CustomerTicketDetail } from '@sistemazero/helpdesk-contracts'
import {
  CustomerTicketCursorInvalidError,
  SourceUnavailableError,
  TicketNotFoundError,
} from '../../domain/helpdesk-errors'
import type {
  CustomerTicketOwner,
  CustomerTicketRepository,
} from '../../domain/ports/customer-ticket-repository.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import { commandHash, initialHandling } from '../../domain/ticket/automation'
import type { TicketCategory, TicketPortal, TicketStatus } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'
import {
  type CustomerMessageView,
  type CustomerTicketView,
  toCustomerMessageView,
  toCustomerTicketView,
} from '../views'
import { decodeCustomerTicketCursor, encodeCustomerTicketCursor } from './customer-ticket-cursor'
import { decodeMessageCursor, encodeMessageCursor } from './message-cursor'

export interface CustomerRequester extends CustomerTicketOwner {
  name: string | null
}

export interface CreateCustomerTicketInput {
  idempotencyKey: string
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

  async byId(requester: CustomerRequester, id: string): Promise<CustomerTicketDetail> {
    return this.page(requester, id, { limit: 50 })
  }

  async page(
    requester: CustomerRequester,
    id: string,
    input: { limit: number; before?: string; after?: string },
  ): Promise<CustomerTicketDetail> {
    if (input.before && input.after) throw new CustomerTicketCursorInvalidError()
    const ticket = await this.requireOwnedTicket(requester, id)
    const rows = await this.messages.page(id, {
      limit: input.limit,
      before: decodeMessageCursor(input.before),
      after: decodeMessageCursor(input.after),
      publicOnly: true,
    })
    const extra = rows.length > input.limit
    const selected = rows.slice(0, input.limit)
    if (!input.after) selected.reverse()
    const evidence = await this.messages.evidence(selected.map((m) => m.id))
    return {
      ticket: toCustomerTicketView(ticket),
      messages: selected.map((m) =>
        toCustomerMessageView(
          m,
          evidence
            .filter((e) => e.messageId === m.id)
            .map(({ messageId, ...citation }) => citation),
        ),
      ),
      hasOlder: !input.after && extra,
      hasMore: !!input.after && extra,
      olderCursor: selected[0] ? encodeMessageCursor(selected[0]) : (input.before ?? null),
      latestCursor: selected.at(-1) ? encodeMessageCursor(selected.at(-1)!) : (input.after ?? null),
    }
  }

  async command(
    requester: CustomerRequester,
    id: string,
    action: 'handoff' | 'resolve',
    idempotencyKey: string,
  ) {
    const ticket = await this.tickets.command({
      owner: requester,
      ticketId: id,
      action,
      commandKey: idempotencyKey,
      at: this.now(),
    })
    if (!ticket) throw new TicketNotFoundError()
    return { ticket: toCustomerTicketView(ticket) }
  }

  async source(requester: CustomerRequester, id: string, citationId: string) {
    await this.requireOwnedTicket(requester, id)
    const source = await this.messages.publicSource(id, citationId, this.now())
    if (!source) throw new SourceUnavailableError()
    return source
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
      aiDraftRunId: null,
      aiDraft: null,
      aiDraftAt: null,
      aiDraftEdited: false,
      aiClassification: null,
      ...initialHandling(),
      aiGeneration: 1,
      aiStatus: this.config.aiEnabled ? ('pending' as const) : ('skipped' as const),
      aiNextAttemptAt: this.config.aiEnabled ? at : null,
      aiAttempts: 0,
      aiLastError: null,
      // Portal é sempre atendimento: pessoa autenticada escrevendo para a equipe.
      triage: 'human' as const,
      triageRule: null,
      triagedAt: null,
      createdAt: at,
      updatedAt: at,
    }
    const message = this.customerMessage({ ticketId, body, requester, subject, at })
    const saved = await this.tickets.createWithInitialMessage({
      ticket,
      message,
      commandKey: input.idempotencyKey,
      commandHash: commandHash([
        'create',
        subject,
        body,
        input.category ?? null,
        input.portal ?? null,
      ]),
      aiEnabled: this.config.aiEnabled,
    })
    return {
      ticket: toCustomerTicketView(saved.ticket),
      message: toCustomerMessageView(saved.message),
    }
  }

  async addMessage(
    requester: CustomerRequester,
    ticketId: string,
    body: string,
    idempotencyKey: string,
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
      commandKey: idempotencyKey,
      commandHash: commandHash(['message', ticketId, body.trim()]),
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
      aiRunId: null,
      draftEdited: null,
      bodyHtml: null,
      snippet: input.body.slice(0, 500),
      attachments: [],
      isAutoreply: false,
      triage: 'human',
      triageRule: null,
      gmailInternalDate: null,
      createdBy: null,
      createdByName: null,
      createdAt: input.at,
    }
  }
}
