import type { GmailConnection } from '../../src/domain/connection/gmail-connection'
import type { ConnectionRepository } from '../../src/domain/ports/connection-repository.port'
import type {
  CustomerTicketOwner,
  CustomerTicketRepository,
  CustomerTicketsFilter,
} from '../../src/domain/ports/customer-ticket-repository.port'
import type { MessageRepository } from '../../src/domain/ports/message-repository.port'
import type {
  OAuthState,
  OAuthStateRepository,
} from '../../src/domain/ports/oauth-state-repository.port'
import type {
  PortalNotificationOutboxItem,
  PortalNotificationOutboxRepository,
} from '../../src/domain/ports/portal-notification-outbox.port'
import type {
  AppendPortalReplyResult,
  CreateReplyIntentResult,
  PendingReplyMessage,
  ReplyDeliveryRepository,
} from '../../src/domain/ports/reply-delivery-repository.port'
import type { SettingsRepository } from '../../src/domain/ports/settings-repository.port'
import type {
  TicketIngestionInput,
  TicketIngestionRepository,
  TicketIngestionResult,
} from '../../src/domain/ports/ticket-ingestion-repository.port'
import type {
  AiClassificationUpdate,
  AiWriteGuard,
  ListTicketsFilter,
  TicketOperationalPatch,
  TicketRepository,
} from '../../src/domain/ports/ticket-repository.port'
import { DEFAULT_SETTINGS, type HelpdeskSettings } from '../../src/domain/settings/settings'
import { statusOnInbound, statusOnOutbound, type Ticket } from '../../src/domain/ticket/ticket'
import type { TicketMessage } from '../../src/domain/ticket/ticket-message'
import {
  matchesSlaFilter,
  ticketQueuePosition,
  ticketSla,
  ticketSlaRank,
} from '../../src/domain/ticket/ticket-sla'
import {
  densifyVolume,
  spDayKey,
  statsWindows,
  type TicketStats,
} from '../../src/domain/ticket/ticket-stats'
import {
  canRetriage,
  PROMOTED_BY_INBOUND_RULE,
  promoteTicket,
} from '../../src/domain/ticket/ticket-triage'

const clone = <T>(value: T): T => structuredClone(value)

export class InMemoryTicketRepository implements TicketRepository {
  readonly rows = new Map<string, Ticket>()
  readonly notes: TicketMessage[] = []
  async appendNote(note: TicketMessage, at: Date) {
    const ticket = this.rows.get(note.ticketId)
    if (!ticket) return false
    applyHumanTakeover(ticket, at)
    ticket.version++
    this.notes.push(clone(note))
    return true
  }

  async create(ticket: Ticket): Promise<void> {
    this.rows.set(ticket.id, clone(ticket))
  }

  async byId(id: string): Promise<Ticket | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }

  async update(ticket: Ticket, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(ticket.id)
    if (!current || current.version !== expectedVersion) return false
    ticket.version = expectedVersion + 1
    this.rows.set(ticket.id, clone(ticket))
    return true
  }

  async patch(
    id: string,
    expectedVersion: number,
    changes: TicketOperationalPatch,
    at: Date,
  ): Promise<Ticket | null> {
    const current = this.rows.get(id)
    if (!current || current.version !== expectedVersion) return null
    applyHumanTakeover(current, at)
    const row = { ...current, ...clone(changes), version: expectedVersion + 1, updatedAt: at }
    this.rows.set(id, row)
    return clone(row)
  }

  async list(filter: ListTicketsFilter, now: Date): Promise<{ items: Ticket[]; total: number }> {
    const q = filter.q?.toLowerCase()
    const all = [...this.rows.values()]
      .filter((ticket) => ticket.createdAt.getTime() <= now.getTime())
      // A fila nunca mistura atendimento com ruído: ausente = só `human`.
      .filter((t) => (filter.triage === 'automated' ? t.triage !== 'human' : t.triage === 'human'))
      .filter((t) => !filter.handlingMode || t.handlingMode === filter.handlingMode)
      .filter((t) => !filter.status || t.status === filter.status)
      .filter((t) => !filter.category || t.category === filter.category)
      .filter(
        (t) => !filter.assignment || (filter.assignment === 'assigned') === (t.assignedTo !== null),
      )
      .filter((t) => !filter.queue || (t.assignedTo === null && ticketSla(t, now) !== null))
      .filter((t) => !filter.sla || matchesSlaFilter(ticketSla(t, now), filter.sla))
      .filter(
        (t) =>
          !q ||
          t.subject.toLowerCase().includes(q) ||
          t.requesterEmail.toLowerCase().includes(q) ||
          (t.requesterName ?? '').toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          ticketSlaRank(a, now) - ticketSlaRank(b, now) ||
          ticketQueuePosition(a, now).deadlineAt.getTime() -
            ticketQueuePosition(b, now).deadlineAt.getTime() ||
          b.lastMessageAt.getTime() - a.lastMessageAt.getTime() ||
          a.id.localeCompare(b.id),
      )
    const afterCursor = filter.cursor
      ? all.filter((ticket) => {
          const position = ticketQueuePosition(ticket, now)
          return (
            position.operationalRank > filter.cursor!.operationalRank ||
            (position.operationalRank === filter.cursor!.operationalRank &&
              (position.deadlineAt.getTime() > filter.cursor!.deadlineAt.getTime() ||
                (position.deadlineAt.getTime() === filter.cursor!.deadlineAt.getTime() &&
                  (ticket.lastMessageAt.getTime() < filter.cursor!.lastMessageAt.getTime() ||
                    (ticket.lastMessageAt.getTime() === filter.cursor!.lastMessageAt.getTime() &&
                      ticket.id > filter.cursor!.id)))))
          )
        })
      : all
    return {
      items: afterCursor.slice(0, filter.limit + 1).map(clone),
      total: all.length,
    }
  }

  async stats(now: Date): Promise<TicketStats> {
    const w = statsWindows(now)
    const seriesStart = new Date(w.seriesStartIso).getTime()
    const todayStart = new Date(w.todayStartIso).getTime()
    const weekStart = new Date(w.weekStartIso).getTime()
    // O painel nunca conta ruído (espelha o `where triage = 'human'` do SQL).
    const all = [...this.rows.values()].filter((t) => t.triage === 'human')
    const createdByDay = new Map<string, number>()
    let slaAtRisk = 0
    let slaBreached = 0
    let slaUnassigned = 0
    for (const t of all) {
      const sla = ticketSla(t, now)
      if (sla?.state === 'at_risk') slaAtRisk += 1
      if (sla?.state === 'breached') slaBreached += 1
      if (sla && t.assignedTo === null) slaUnassigned += 1
      if (t.createdAt.getTime() >= seriesStart) {
        const k = spDayKey(t.createdAt)
        createdByDay.set(k, (createdByDay.get(k) ?? 0) + 1)
      }
    }
    const resolved = (since: number) =>
      all.filter(
        (t) =>
          (t.status === 'resolved' || t.status === 'closed') &&
          t.resolvedAt !== null &&
          t.resolvedAt.getTime() >= since,
      ).length
    return {
      counts: {
        new: all.filter((t) => t.status === 'new').length,
        open: all.filter((t) => t.status === 'open').length,
        waiting: all.filter((t) => t.status === 'waiting').length,
      },
      resolvedToday: resolved(todayStart),
      resolved7d: resolved(weekStart),
      sla: { atRisk: slaAtRisk, breached: slaBreached, unassigned: slaUnassigned },
      volume: densifyVolume(w.dayKeys, createdByDay),
    }
  }

  async claimAiDue(leaseMs: number, at: Date): Promise<Ticket | null> {
    const due = [...this.rows.values()]
      .filter(
        (t) =>
          (t.aiStatus === 'pending' || t.aiStatus === 'processing') &&
          t.aiNextAttemptAt !== null &&
          t.aiNextAttemptAt.getTime() <= at.getTime(),
      )
      .sort((a, b) => (a.aiNextAttemptAt?.getTime() ?? 0) - (b.aiNextAttemptAt?.getTime() ?? 0))
    const claimed = due[0]
    if (!claimed) return null
    claimed.aiStatus = 'processing'
    claimed.aiNextAttemptAt = new Date(at.getTime() + leaseMs)
    claimed.aiAttempts += 1
    return clone(claimed)
  }

  async applyClassification(
    id: string,
    guard: AiWriteGuard,
    update: AiClassificationUpdate,
  ): Promise<boolean> {
    const t = this.rows.get(id)
    if (!t || !this.acceptsAiWrite(t, guard)) return false
    t.aiSummary = update.summary
    t.aiSummaryAt = update.at
    t.aiClassification = update.classification
    if (!t.categoryManual) t.category = update.category
    if (t.priority === null) t.priority = update.priority
    t.updatedAt = update.at
    return true
  }

  async applyDraft(
    id: string,
    guard: AiWriteGuard,
    draft: string,
    runId: string | null,
    at: Date,
  ): Promise<boolean> {
    const t = this.rows.get(id)
    if (!t || !this.acceptsAiWrite(t, guard)) return false
    t.aiDraftRunId = runId
    t.aiDraft = draft
    t.aiDraftAt = at
    t.aiDraftEdited = false
    t.updatedAt = at
    return true
  }

  async markAiDone(id: string, guard: AiWriteGuard, at: Date): Promise<boolean> {
    const t = this.rows.get(id)
    if (!t || !this.acceptsAiWrite(t, guard)) return false
    t.aiStatus = 'done'
    t.aiLastError = null
    t.aiNextAttemptAt = null
    t.aiAttempts = 0
    t.updatedAt = at
    return true
  }

  async scheduleAiRetry(
    id: string,
    guard: AiWriteGuard,
    nextAt: Date,
    error: string,
    at: Date,
  ): Promise<boolean> {
    const t = this.rows.get(id)
    if (!t || !this.acceptsAiWrite(t, guard)) return false
    t.aiStatus = 'pending'
    t.aiNextAttemptAt = nextAt
    t.aiLastError = error
    t.updatedAt = at
    return true
  }

  async markAiFailed(id: string, guard: AiWriteGuard, error: string, at: Date): Promise<boolean> {
    const t = this.rows.get(id)
    if (!t || !this.acceptsAiWrite(t, guard)) return false
    t.aiStatus = 'failed'
    t.aiLastError = error
    t.aiNextAttemptAt = null
    t.updatedAt = at
    return true
  }

  private acceptsAiWrite(ticket: Ticket, guard: AiWriteGuard): boolean {
    return (
      ticket.aiGeneration === guard.generation &&
      (guard.processingAttempt === undefined ||
        (ticket.aiStatus === 'processing' && ticket.aiAttempts === guard.processingAttempt))
    )
  }
}

export class InMemoryMessageRepository implements MessageRepository {
  constructor(private readonly notes: TicketMessage[] = []) {}
  readonly rows: TicketMessage[] = []

  async create(message: TicketMessage): Promise<void> {
    this.rows.push(clone(message))
  }

  async page(ticketId: string, input: Parameters<MessageRepository['page']>[1]) {
    const cursor = input.after ?? input.before
    return [...this.rows, ...this.notes]
      .map((m, i) => ({ ...clone(m), position: i + 1 }))
      .filter((m) => m.ticketId === ticketId)
      .filter(
        (m) =>
          !input.publicOnly ||
          (m.visibility === 'customer' &&
            m.kind !== 'note' &&
            (!m.deliveryState || m.deliveryState === 'sent')),
      )
      .filter(
        (m) =>
          !cursor || (input.after ? m.position > cursor.position : m.position < cursor.position),
      )
      .sort((a, b) => (input.after ? a.position - b.position : b.position - a.position))
      .slice(0, input.limit + 1)
  }
  async evidence(_ids: string[]) {
    return []
  }
  async publicSource(_ticketId: string, _citationId: string, _at: Date) {
    return null
  }

  async byTicketId(ticketId: string): Promise<TicketMessage[]> {
    return [...this.rows, ...this.notes]
      .filter((m) => m.ticketId === ticketId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone)
  }
}

export class InMemoryPortalNotificationOutboxRepository
  implements PortalNotificationOutboxRepository
{
  readonly rows = new Map<string, PortalNotificationOutboxItem>()

  async claimDue(leaseMs: number, at: Date): Promise<PortalNotificationOutboxItem | null> {
    const due = [...this.rows.values()]
      .filter(
        (item) =>
          (item.status === 'pending' && item.nextAttemptAt.getTime() <= at.getTime()) ||
          (item.status === 'processing' &&
            item.leaseExpiresAt !== null &&
            item.leaseExpiresAt.getTime() <= at.getTime()),
      )
      .sort(
        (a, b) =>
          (a.status === 'processing' ? a.leaseExpiresAt!.getTime() : a.nextAttemptAt.getTime()) -
            (b.status === 'processing' ? b.leaseExpiresAt!.getTime() : b.nextAttemptAt.getTime()) ||
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )[0]
    if (!due) return null
    due.status = 'processing'
    due.attempts += 1
    due.leaseExpiresAt = new Date(at.getTime() + leaseMs)
    due.updatedAt = at
    return clone(due)
  }

  async markSent(id: string, attempt: number, at: Date): Promise<boolean> {
    const item = this.rows.get(id)
    if (item?.status !== 'processing' || item.attempts !== attempt) return false
    item.status = 'sent'
    item.leaseExpiresAt = null
    item.sentAt = at
    item.lastError = null
    item.updatedAt = at
    return true
  }

  async scheduleRetry(
    id: string,
    attempt: number,
    nextAt: Date,
    error: string,
    at: Date,
  ): Promise<boolean> {
    const item = this.rows.get(id)
    if (item?.status !== 'processing' || item.attempts !== attempt) return false
    item.status = 'pending'
    item.nextAttemptAt = nextAt
    item.leaseExpiresAt = null
    item.lastError = error.slice(0, 500)
    item.updatedAt = at
    return true
  }
}

/** Contrato transacional do portal reproduzido em memória para testes HTTP. */
export class InMemoryCustomerTicketRepository implements CustomerTicketRepository {
  private readonly commands = new Map<
    string,
    { hash: string; ticketId: string; messageId: string }
  >()
  constructor(
    private readonly tickets: InMemoryTicketRepository,
    private readonly messages: InMemoryMessageRepository,
  ) {}

  private readonly lifecycleCommands = new Map<string, string>()
  async command(input: Parameters<CustomerTicketRepository['command']>[0]) {
    const ticket = this.tickets.rows.get(input.ticketId)
    if (!ticket || !this.owns(ticket, input.owner)) return null
    const key = `${input.owner.accountId}:${input.commandKey}`
    const hash = `${input.ticketId}:${input.action}`
    const prior = this.lifecycleCommands.get(key)
    if (this.commands.has(key) || (prior && prior !== hash)) throw new ConcurrencyConflictError()
    if (prior) return clone(ticket)
    if (
      input.action === 'resolve' &&
      !this.messages.rows.some(
        (m) =>
          m.ticketId === ticket.id &&
          m.direction === 'outbound' &&
          m.visibility === 'customer' &&
          (!m.deliveryState || m.deliveryState === 'sent'),
      )
    )
      throw new ConcurrencyConflictError()
    ticket.handlingMode = 'human'
    ticket.humanTakeover = true
    ticket.handlingEpoch++
    ticket.version++
    if (input.action === 'resolve') {
      ticket.status = 'resolved'
      ticket.resolvedAt = input.at
      ticket.humanSlaStartedAt = null
    } else {
      ticket.handoffReason = 'customer_requested'
      if (!['closed', 'resolved'].includes(ticket.status)) ticket.status = 'open'
      ticket.humanSlaStartedAt ??= ticket.automationStartedAt
    }
    this.lifecycleCommands.set(key, hash)
    return clone(ticket)
  }

  async createWithInitialMessage(
    input: Parameters<CustomerTicketRepository['createWithInitialMessage']>[0],
  ) {
    const key = `${input.ticket.requesterAccountId}:${input.commandKey}`
    const replay = this.replay(key, input.commandHash)
    if (replay) return replay
    this.tickets.rows.set(input.ticket.id, clone(input.ticket))
    this.messages.rows.push(clone(input.message))
    this.commands.set(key, {
      hash: input.commandHash,
      ticketId: input.ticket.id,
      messageId: input.message.id,
    })
    return { ticket: clone(input.ticket), message: clone(input.message) }
  }

  async listOwned(filter: CustomerTicketsFilter): Promise<{ items: Ticket[]; total: number }> {
    const all = [...this.tickets.rows.values()]
      .filter((ticket) => this.owns(ticket, filter))
      .filter((ticket) => !filter.status || ticket.status === filter.status)
      .sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime() || a.id.localeCompare(b.id),
      )
    const afterCursor = filter.cursor
      ? all.filter(
          (ticket) =>
            ticket.lastMessageAt.getTime() < filter.cursor!.lastMessageAt.getTime() ||
            (ticket.lastMessageAt.getTime() === filter.cursor!.lastMessageAt.getTime() &&
              ticket.id > filter.cursor!.id),
        )
      : all
    return {
      items: afterCursor.slice(0, filter.limit + 1).map(clone),
      total: all.length,
    }
  }

  async byIdOwned(id: string, owner: CustomerTicketOwner): Promise<Ticket | null> {
    const ticket = this.tickets.rows.get(id)
    return ticket && this.owns(ticket, owner) ? clone(ticket) : null
  }

  async appendCustomerMessage(input: {
    ticketId: string
    owner: CustomerTicketOwner
    message: TicketMessage
    at: Date
    aiEnabled: boolean
    commandKey: string
    commandHash: string
  }): Promise<{ ticket: Ticket; message: TicketMessage } | null> {
    const ticket = this.tickets.rows.get(input.ticketId)
    if (!ticket || !this.owns(ticket, input.owner)) return null
    const key = `${input.owner.accountId}:${input.commandKey}`
    const replay = this.replay(key, input.commandHash)
    if (replay) return replay
    ticket.version += 1
    ticket.messageCount += 1
    if (input.at.getTime() > ticket.lastMessageAt.getTime()) ticket.lastMessageAt = input.at
    if (!ticket.lastInboundAt || input.at.getTime() > ticket.lastInboundAt.getTime()) {
      ticket.lastInboundAt = input.at
    }
    ticket.status = statusOnInbound(ticket.status)
    if (ticket.status === 'open') ticket.resolvedAt = null
    ticket.aiGeneration += 1
    ticket.aiSummary = null
    ticket.aiSummaryAt = null
    ticket.aiDraftRunId = null
    ticket.aiDraft = null
    ticket.aiDraftAt = null
    ticket.aiDraftEdited = false
    ticket.aiClassification = null
    ticket.aiStatus = input.aiEnabled ? 'pending' : 'skipped'
    ticket.aiNextAttemptAt = input.aiEnabled ? input.at : null
    ticket.aiAttempts = 0
    ticket.aiLastError = null
    ticket.updatedAt = input.at
    this.messages.rows.push(clone(input.message))
    this.commands.set(key, {
      hash: input.commandHash,
      ticketId: ticket.id,
      messageId: input.message.id,
    })
    return { ticket: clone(ticket), message: clone(input.message) }
  }

  private owns(ticket: Ticket, owner: CustomerTicketOwner): boolean {
    return (
      ticket.requesterAccountId === owner.accountId ||
      (ticket.requesterAccountId === null &&
        ticket.requesterEmail.toLowerCase() === owner.email.toLowerCase())
    )
  }
  private replay(key: string, hash: string) {
    const command = this.commands.get(key)
    if (!command) return null
    if (command.hash !== hash)
      throw new ConcurrencyConflictError('Chave de idempotência já usada para outro pedido')
    const ticket = this.tickets.rows.get(command.ticketId)
    const message = this.messages.rows.find((item) => item.id === command.messageId)
    if (!ticket || !message) throw new Error('Command result absent')
    return { ticket: clone(ticket), message: clone(message) }
  }
}

/** Implementação determinística do contrato transacional usado nos testes HTTP/unitários. */
export class InMemoryTicketIngestionRepository implements TicketIngestionRepository {
  constructor(
    private readonly tickets: InMemoryTicketRepository,
    private readonly messages: InMemoryMessageRepository,
  ) {}

  async ingest(input: TicketIngestionInput): Promise<TicketIngestionResult> {
    if (
      this.messages.rows.some((message) => message.gmailMessageId === input.message.gmailMessageId)
    ) {
      return { status: 'duplicate' }
    }

    const deliveryByRfc822MessageId = input.message.rfc822MessageId
      ? this.messages.rows.find(
          (message) =>
            message.rfc822MessageId === input.message.rfc822MessageId &&
            message.direction === 'outbound',
        )
      : undefined
    const existing = deliveryByRfc822MessageId
      ? this.tickets.rows.get(deliveryByRfc822MessageId.ticketId)
      : [...this.tickets.rows.values()].find(
          (ticket) => ticket.gmailThreadId === input.ticket.gmailThreadId,
        )
    if (!existing) {
      this.tickets.rows.set(input.ticket.id, clone(input.ticket))
      this.messages.rows.push(clone(input.message))
      return { status: 'created', ticketId: input.ticket.id }
    }

    if (
      deliveryByRfc822MessageId &&
      (deliveryByRfc822MessageId.deliveryState === 'pending' ||
        deliveryByRfc822MessageId.deliveryState === 'unknown')
    ) {
      deliveryByRfc822MessageId.gmailMessageId = input.message.gmailMessageId
      deliveryByRfc822MessageId.deliveryState = 'sent'
      deliveryByRfc822MessageId.deliveryLastError = null
      deliveryByRfc822MessageId.gmailInternalDate = input.at
    } else {
      this.messages.rows.push(clone({ ...input.message, ticketId: existing.id }))
    }
    existing.version += 1
    existing.messageCount += 1
    const isLatest = input.at.getTime() >= existing.lastMessageAt.getTime()
    if (input.at.getTime() < existing.firstMessageAt.getTime()) {
      existing.firstMessageAt = input.at
    }
    if (input.at.getTime() > existing.lastMessageAt.getTime()) {
      existing.lastMessageAt = input.at
    }
    if (input.at.getTime() > existing.updatedAt.getTime()) existing.updatedAt = input.at
    // Qualquer e-mail que NÓS mandamos vincula a thread do Gmail, triado ou não.
    if (input.direction === 'outbound') existing.gmailThreadId ??= input.ticket.gmailThreadId
    const humanTicket = existing.triage === 'human'

    // Espelha os ramos do DrizzleTicketIngestionRepository (mudou lá, muda aqui).
    if (input.message.triage !== 'human') {
      // Triado: só contabiliza. `bounce` em ticket humano reabre.
      if (
        input.message.triage === 'bounce' &&
        humanTicket &&
        isLatest &&
        (existing.status === 'waiting' ||
          existing.status === 'resolved' ||
          existing.status === 'closed')
      ) {
        existing.status = 'open'
        existing.resolvedAt = null
      }
      return { status: 'appended', ticketId: existing.id }
    }

    if (input.direction === 'outbound') {
      if (humanTicket && isLatest) existing.status = statusOnOutbound(existing.status)
      return { status: 'appended', ticketId: existing.id }
    }

    // Inbound humano.
    if (!existing.lastInboundAt || input.at.getTime() > existing.lastInboundAt.getTime()) {
      existing.lastInboundAt = input.at
    }
    if (!humanTicket && canRetriage(existing)) {
      // Promoção independe do gate temporal (backfill chega do mais novo p/ o mais antigo).
      const updatedAt = existing.updatedAt
      promoteTicket(existing, {
        rule: PROMOTED_BY_INBOUND_RULE,
        at: input.at,
        lastHumanInboundAt: existing.lastInboundAt,
        aiEnabled: input.aiEnabled,
      })
      if (updatedAt.getTime() > existing.updatedAt.getTime()) existing.updatedAt = updatedAt
      return { status: 'appended', ticketId: existing.id }
    }
    if (humanTicket && isLatest) {
      existing.status = statusOnInbound(existing.status)
      if (existing.status === 'open') existing.resolvedAt = null
      existing.aiGeneration += 1
      existing.aiSummary = null
      existing.aiSummaryAt = null
      existing.aiDraftRunId = null
      existing.aiDraft = null
      existing.aiDraftAt = null
      existing.aiDraftEdited = false
      existing.aiClassification = null
      existing.aiStatus = input.aiEnabled ? 'pending' : 'skipped'
      existing.aiNextAttemptAt = input.aiEnabled ? input.at : null
      existing.aiAttempts = 0
      existing.aiLastError = null
    }
    return { status: 'appended', ticketId: existing.id }
  }
}

export class InMemoryReplyDeliveryRepository implements ReplyDeliveryRepository {
  constructor(
    private readonly tickets: InMemoryTicketRepository,
    private readonly messages: InMemoryMessageRepository,
    private readonly notificationOutbox: InMemoryPortalNotificationOutboxRepository,
  ) {}

  async createIntent(input: {
    ticketId: string
    expectedVersion: number
    message: PendingReplyMessage
    at: Date
  }): Promise<CreateReplyIntentResult> {
    const ticket = this.tickets.rows.get(input.ticketId)
    if (!ticket) return { status: 'not_found' }
    if (
      this.messages.rows.some(
        (message) =>
          message.ticketId === input.ticketId &&
          (message.deliveryState === 'pending' || message.deliveryState === 'unknown'),
      )
    ) {
      return { status: 'pending' }
    }
    if (ticket.version !== input.expectedVersion) return { status: 'conflict' }

    ticket.version += 1
    ticket.updatedAt = input.at
    this.messages.rows.push(clone(input.message))
    return { status: 'created', intent: { ticket: clone(ticket), message: clone(input.message) } }
  }

  async markSent(input: {
    messageId: string
    gmailMessageId: string
    gmailThreadId: string
    at: Date
  }): Promise<{ ticket: Ticket; message: TicketMessage } | null> {
    const message = this.messages.rows.find((candidate) => candidate.id === input.messageId)
    if (!message) return null
    const ticket = this.tickets.rows.get(message.ticketId)
    if (!ticket) return null
    if (message.deliveryState === 'sent') return { ticket: clone(ticket), message: clone(message) }
    if (message.deliveryState !== 'pending' && message.deliveryState !== 'unknown') return null

    message.gmailMessageId = input.gmailMessageId
    message.deliveryState = 'sent'
    message.deliveryLastError = null
    message.gmailInternalDate = input.at
    ticket.version += 1
    ticket.gmailThreadId ??= input.gmailThreadId
    if (ticket.status === 'new' || ticket.status === 'open') ticket.status = 'waiting'
    ticket.messageCount += 1
    if (input.at.getTime() > ticket.lastMessageAt.getTime()) ticket.lastMessageAt = input.at
    ticket.updatedAt = input.at
    return { ticket: clone(ticket), message: clone(message) }
  }

  async appendPortalReply(input: {
    ticketId: string
    expectedVersion: number
    message: TicketMessage
    notification: Parameters<ReplyDeliveryRepository['appendPortalReply']>[0]['notification']
    at: Date
  }): Promise<AppendPortalReplyResult> {
    const ticket = this.tickets.rows.get(input.ticketId)
    if (!ticket) return { status: 'not_found' }
    if (
      this.messages.rows.some(
        (message) =>
          message.ticketId === input.ticketId &&
          (message.deliveryState === 'pending' || message.deliveryState === 'unknown'),
      )
    ) {
      return { status: 'pending' }
    }
    if (ticket.version !== input.expectedVersion) return { status: 'conflict' }

    ticket.version += 1
    if (ticket.status === 'new' || ticket.status === 'open') ticket.status = 'waiting'
    ticket.messageCount += 1
    if (input.at.getTime() > ticket.lastMessageAt.getTime()) ticket.lastMessageAt = input.at
    ticket.updatedAt = input.at
    this.messages.rows.push(clone(input.message))
    this.notificationOutbox.rows.set(input.notification.id, clone(input.notification))
    return { status: 'created', ticket: clone(ticket), message: clone(input.message) }
  }

  async markUnknown(messageId: string, error: string): Promise<void> {
    const message = this.messages.rows.find((candidate) => candidate.id === messageId)
    if (message?.deliveryState !== 'pending') return
    message.deliveryState = 'unknown'
    message.deliveryLastError = error.slice(0, 500)
  }

  async markFailed(messageId: string, error: string): Promise<TicketMessage | null> {
    const message = this.messages.rows.find((candidate) => candidate.id === messageId)
    if (!message || (message.deliveryState !== 'pending' && message.deliveryState !== 'unknown')) {
      return null
    }
    message.deliveryState = 'failed'
    message.deliveryLastError = error.slice(0, 500)
    return clone(message)
  }
}

export { InMemoryKbRepository } from './knowledge'

export class InMemorySettingsRepository implements SettingsRepository {
  value: HelpdeskSettings = { ...DEFAULT_SETTINGS }

  async get(): Promise<HelpdeskSettings> {
    return clone(this.value)
  }

  async update(settings: HelpdeskSettings): Promise<void> {
    this.value = clone(settings)
  }
}

export class InMemoryConnectionRepository implements ConnectionRepository {
  readonly rows = new Map<string, GmailConnection>()

  async activate(connection: GmailConnection): Promise<void> {
    for (const existing of this.rows.values()) {
      if (
        existing.id !== connection.id &&
        (existing.status === 'connected' || existing.status === 'needs_reauth')
      ) {
        existing.version += 1
        existing.accessTokenEnc = null
        existing.refreshTokenEnc = null
        existing.tokenExpiresAt = null
        existing.status = 'disabled'
        existing.lastSyncError = null
        existing.updatedAt = connection.updatedAt
      }
    }
    this.rows.set(connection.id, clone(connection))
  }

  async byId(id: string): Promise<GmailConnection | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }

  async byExternalId(externalId: string): Promise<GmailConnection | null> {
    for (const row of this.rows.values()) {
      if (row.externalId === externalId) return clone(row)
    }
    return null
  }

  async current(): Promise<GmailConnection | null> {
    const active = [...this.rows.values()]
      .filter((c) => c.status === 'connected' || c.status === 'needs_reauth')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    return active[0] ? clone(active[0]) : null
  }

  async update(connection: GmailConnection): Promise<void> {
    this.rows.set(connection.id, clone(connection))
  }

  async claimDue(leaseMs: number, at: Date): Promise<GmailConnection | null> {
    const due = [...this.rows.values()]
      .filter((c) => c.status === 'connected' && c.syncNextAt.getTime() <= at.getTime())
      .sort((a, b) => a.syncNextAt.getTime() - b.syncNextAt.getTime())
    const claimed = due[0]
    if (!claimed) return null
    claimed.syncNextAt = new Date(at.getTime() + leaseMs)
    claimed.syncAttempts += 1
    this.rows.set(claimed.id, claimed)
    return clone(claimed)
  }
}

export class InMemoryOAuthStateRepository implements OAuthStateRepository {
  readonly rows = new Map<string, OAuthState>()

  async create(state: OAuthState): Promise<void> {
    this.rows.set(state.state, clone(state))
  }

  async consume(state: string, at: Date): Promise<OAuthState | null> {
    const row = this.rows.get(state)
    if (!row || row.usedAt || row.expiresAt.getTime() <= at.getTime()) return null
    row.usedAt = at
    this.rows.set(state, row)
    return clone(row)
  }

  async deleteExpired(before: Date): Promise<number> {
    let deleted = 0
    for (const [key, row] of this.rows) {
      if (row.expiresAt.getTime() < before.getTime()) {
        this.rows.delete(key)
        deleted++
      }
    }
    return deleted
  }
}

import { ConcurrencyConflictError } from '../../src/domain/helpdesk-errors'
import { applyHumanTakeover } from '../../src/domain/ticket/automation'
