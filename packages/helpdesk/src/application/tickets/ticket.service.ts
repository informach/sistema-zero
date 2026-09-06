import {
  ConcurrencyConflictError,
  TicketCursorInvalidError,
  TicketNotFoundError,
} from '../../domain/helpdesk-errors'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { ListTicketsFilter, TicketRepository } from '../../domain/ports/ticket-repository.port'
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../domain/ticket/ticket'
import { isTerminalTicketStatus } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'
import type { TicketStats } from '../../domain/ticket/ticket-stats'
import {
  demoteTicket,
  MANUAL_DEMOTED_RULE,
  MANUAL_PROMOTED_RULE,
  promoteTicket,
} from '../../domain/ticket/ticket-triage'
import type { Actor } from '../actor'
import { type MessageView, type TicketView, toMessageView, toTicketView } from '../views'
import { decodeTicketCursor, encodeTicketCursor } from './ticket-cursor'

export interface PatchTicketInput {
  status?: TicketStatus
  category?: TicketCategory | null
  priority?: TicketPriority | null
  /** null = desatribuir; string = atribuir ao próprio ator (assignToMe). */
  assignToMe?: boolean
  /**
   * Decisão humana de triagem: `human` = "É atendimento" (volta para a fila);
   * `system` = "Não é atendimento" (sai da fila). Só esses dois entram de fora;
   * a decisão fica gravada como `manual:*` e a ingestão nunca a desfaz.
   */
  triage?: 'human' | 'system'
  version: number
}

export interface ListTicketsInput extends Omit<ListTicketsFilter, 'cursor'> {
  cursor?: string
}

export interface TicketServiceConfig {
  /** Promover re-arma a IA só quando o grupo está configurado. */
  aiEnabled: boolean
}

export class TicketService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly messages: MessageRepository,
    private readonly config: TicketServiceConfig,
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  async list(filter: ListTicketsInput): Promise<{
    items: TicketView[]
    total: number
    hasMore: boolean
    nextCursor: string | null
  }> {
    const cursor = decodeTicketCursor(filter.cursor)
    if (filter.cursor !== undefined && !cursor) throw new TicketCursorInvalidError()
    const snapshotAt = cursor?.snapshotAt ?? this.now()
    const page = await this.tickets.list({ ...filter, cursor }, snapshotAt)
    const items = page.items.slice(0, filter.limit)
    const last = items.at(-1)
    const hasMore = page.items.length > filter.limit
    return {
      items: items.map((ticket) => toTicketView(ticket, snapshotAt)),
      total: page.total,
      hasMore,
      nextCursor: hasMore && last ? encodeTicketCursor(last, snapshotAt) : null,
    }
  }

  /** Agregados do painel (contagens, resolvidos e série de volume). */
  async stats(): Promise<TicketStats> {
    return this.tickets.stats(this.now())
  }

  async byId(id: string): Promise<{ ticket: TicketView; messages: MessageView[] }> {
    const ticket = await this.requireTicket(id)
    const messages = await this.messages.byTicketId(id)
    return { ticket: toTicketView(ticket, this.now()), messages: messages.map(toMessageView) }
  }

  async patch(actor: Actor, id: string, input: PatchTicketInput): Promise<TicketView> {
    const ticket = await this.requireTicket(id)
    const now = this.now()
    // Triagem primeiro: promover põe `new`; um `status` explícito no mesmo corpo vence.
    if (input.triage === 'human' && ticket.triage !== 'human') {
      promoteTicket(ticket, {
        rule: MANUAL_PROMOTED_RULE,
        at: now,
        lastHumanInboundAt: await this.lastHumanInboundAt(id),
        aiEnabled: this.config.aiEnabled,
      })
    } else if (input.triage === 'system') {
      // Vale também em ticket já triado: a decisão vira `manual:*` e fica sticky.
      demoteTicket(ticket, { kind: 'system', rule: MANUAL_DEMOTED_RULE, at: now })
    }
    if (input.status !== undefined) {
      ticket.status = input.status
      if (isTerminalTicketStatus(input.status)) {
        // Preserva o instante original ao editar outro campo de um ticket já
        // encerrado; uma transição nova recebe a hora real do encerramento.
        ticket.resolvedAt ??= now
      } else {
        ticket.resolvedAt = null
      }
    }
    if (input.category !== undefined) {
      ticket.category = input.category
      // Escolha humana de categoria trava a reclassificação automática.
      ticket.categoryManual = input.category !== null
    }
    if (input.priority !== undefined) ticket.priority = input.priority
    if (input.assignToMe !== undefined) {
      ticket.assignedTo = input.assignToMe ? actor.userId : null
      ticket.assignedToName = input.assignToMe ? actor.displayName : null
    }
    ticket.updatedAt = now
    const ok = await this.tickets.update(ticket, input.version)
    if (!ok) throw new ConcurrencyConflictError()
    return toTicketView(ticket, now)
  }

  /** Nota INTERNA (não vira e-mail): só aparece na thread para a equipe. */
  async addNote(actor: Actor, id: string, body: string): Promise<MessageView> {
    await this.requireTicket(id)
    const at = this.now()
    const note: TicketMessage = {
      id: this.idGen(),
      ticketId: id,
      kind: 'note',
      visibility: 'internal',
      gmailMessageId: null,
      rfc822MessageId: null,
      deliveryState: null,
      deliveryLastError: null,
      direction: null,
      sentVia: null,
      fromEmail: null,
      fromName: null,
      toEmails: [],
      ccEmails: [],
      subject: null,
      bodyText: body.trim(),
      bodyHtml: null,
      snippet: null,
      attachments: [],
      isAutoreply: false,
      triage: 'human',
      triageRule: null,
      gmailInternalDate: null,
      createdBy: actor.userId,
      createdByName: actor.displayName,
      createdAt: at,
    }
    await this.messages.create(note)
    return toMessageView(note)
  }

  /**
   * Instante do último inbound HUMANO (o SLA parte dele ao promover). Nunca
   * `firstMessageAt`: num thread aberto por nós, a primeira mensagem é a NOSSA.
   */
  private async lastHumanInboundAt(ticketId: string): Promise<Date | null> {
    const thread = await this.messages.byTicketId(ticketId)
    const last = [...thread]
      .reverse()
      .find((message) => message.direction === 'inbound' && message.triage === 'human')
    return last ? (last.gmailInternalDate ?? last.createdAt) : null
  }

  private async requireTicket(id: string): Promise<Ticket> {
    const ticket = await this.tickets.byId(id)
    if (!ticket) throw new TicketNotFoundError()
    return ticket
  }
}
