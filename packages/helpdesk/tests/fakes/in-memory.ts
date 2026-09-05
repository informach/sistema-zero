import type { GmailConnection } from '../../src/domain/connection/gmail-connection'
import type { KbArticle } from '../../src/domain/kb/kb-article'
import type { ConnectionRepository } from '../../src/domain/ports/connection-repository.port'
import type {
  CustomerTicketOwner,
  CustomerTicketRepository,
  CustomerTicketsFilter,
} from '../../src/domain/ports/customer-ticket-repository.port'
import type { KbRepository } from '../../src/domain/ports/kb-repository.port'
import type { MessageRepository } from '../../src/domain/ports/message-repository.port'
import type {
  OAuthState,
  OAuthStateRepository,
} from '../../src/domain/ports/oauth-state-repository.port'
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
  ListTicketsFilter,
  TicketRepository,
} from '../../src/domain/ports/ticket-repository.port'
import { DEFAULT_SETTINGS, type HelpdeskSettings } from '../../src/domain/settings/settings'
import { statusOnInbound, type Ticket } from '../../src/domain/ticket/ticket'
import type { TicketMessage } from '../../src/domain/ticket/ticket-message'
import { matchesSlaFilter, ticketSla, ticketSlaRank } from '../../src/domain/ticket/ticket-sla'
import {
  densifyVolume,
  spDayKey,
  statsWindows,
  type TicketStats,
} from '../../src/domain/ticket/ticket-stats'

const clone = <T>(value: T): T => structuredClone(value)

export class InMemoryTicketRepository implements TicketRepository {
  readonly rows = new Map<string, Ticket>()

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

  async list(filter: ListTicketsFilter, now: Date): Promise<{ items: Ticket[]; total: number }> {
    const q = filter.q?.toLowerCase()
    const all = [...this.rows.values()]
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
          (ticketSla(a, now)?.deadlineAt.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (ticketSla(b, now)?.deadlineAt.getTime() ?? Number.MAX_SAFE_INTEGER) ||
          b.lastMessageAt.getTime() - a.lastMessageAt.getTime() ||
          a.id.localeCompare(b.id),
      )
    return {
      items: all.slice(filter.offset, filter.offset + filter.limit).map(clone),
      total: all.length,
    }
  }

  async stats(now: Date): Promise<TicketStats> {
    const w = statsWindows(now)
    const seriesStart = new Date(w.seriesStartIso).getTime()
    const todayStart = new Date(w.todayStartIso).getTime()
    const weekStart = new Date(w.weekStartIso).getTime()
    const all = [...this.rows.values()]
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

  async applyClassification(id: string, update: AiClassificationUpdate): Promise<void> {
    const t = this.rows.get(id)
    if (!t) return
    t.aiSummary = update.summary
    t.aiSummaryAt = update.at
    t.aiClassification = update.classification
    if (!t.categoryManual) t.category = update.category
    if (t.priority === null) t.priority = update.priority
    t.updatedAt = update.at
  }

  async applyDraft(id: string, draft: string, at: Date): Promise<void> {
    const t = this.rows.get(id)
    if (!t) return
    t.aiDraft = draft
    t.aiDraftAt = at
    t.aiDraftEdited = false
    t.updatedAt = at
  }

  async markAiDone(id: string, at: Date): Promise<void> {
    const t = this.rows.get(id)
    if (!t) return
    t.aiStatus = 'done'
    t.aiLastError = null
    t.aiNextAttemptAt = null
    t.aiAttempts = 0
    t.updatedAt = at
  }

  async scheduleAiRetry(id: string, nextAt: Date, error: string, at: Date): Promise<void> {
    const t = this.rows.get(id)
    if (!t) return
    t.aiStatus = 'pending'
    t.aiNextAttemptAt = nextAt
    t.aiLastError = error
    t.updatedAt = at
  }

  async markAiFailed(id: string, error: string, at: Date): Promise<void> {
    const t = this.rows.get(id)
    if (!t) return
    t.aiStatus = 'failed'
    t.aiLastError = error
    t.aiNextAttemptAt = null
    t.updatedAt = at
  }
}

export class InMemoryMessageRepository implements MessageRepository {
  readonly rows: TicketMessage[] = []

  async create(message: TicketMessage): Promise<void> {
    this.rows.push(clone(message))
  }

  async byTicketId(ticketId: string): Promise<TicketMessage[]> {
    return this.rows
      .filter((m) => m.ticketId === ticketId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone)
  }
}

/** Contrato transacional do portal reproduzido em memória para testes HTTP. */
export class InMemoryCustomerTicketRepository implements CustomerTicketRepository {
  constructor(
    private readonly tickets: InMemoryTicketRepository,
    private readonly messages: InMemoryMessageRepository,
  ) {}

  async createWithInitialMessage(input: { ticket: Ticket; message: TicketMessage }): Promise<void> {
    this.tickets.rows.set(input.ticket.id, clone(input.ticket))
    this.messages.rows.push(clone(input.message))
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
  }): Promise<{ ticket: Ticket; message: TicketMessage } | null> {
    const ticket = this.tickets.rows.get(input.ticketId)
    if (!ticket || !this.owns(ticket, input.owner)) return null
    ticket.version += 1
    ticket.messageCount += 1
    if (input.at.getTime() > ticket.lastMessageAt.getTime()) ticket.lastMessageAt = input.at
    if (!ticket.lastInboundAt || input.at.getTime() > ticket.lastInboundAt.getTime()) {
      ticket.lastInboundAt = input.at
    }
    ticket.status = statusOnInbound(ticket.status)
    if (ticket.status === 'open') ticket.resolvedAt = null
    if (input.aiEnabled) {
      ticket.aiStatus = 'pending'
      ticket.aiNextAttemptAt = input.at
      ticket.aiAttempts = 0
      ticket.aiLastError = null
    }
    ticket.updatedAt = input.at
    this.messages.rows.push(clone(input.message))
    return { ticket: clone(ticket), message: clone(input.message) }
  }

  private owns(ticket: Ticket, owner: CustomerTicketOwner): boolean {
    return (
      ticket.requesterAccountId === owner.accountId ||
      (ticket.requesterAccountId === null &&
        ticket.requesterEmail.toLowerCase() === owner.email.toLowerCase())
    )
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
    if (input.at.getTime() > existing.lastMessageAt.getTime()) {
      existing.lastMessageAt = input.at
    }
    if (input.direction === 'outbound') {
      existing.gmailThreadId ??= input.ticket.gmailThreadId
      if (existing.status === 'new' || existing.status === 'open') existing.status = 'waiting'
    } else {
      if (!existing.lastInboundAt || input.at.getTime() > existing.lastInboundAt.getTime()) {
        existing.lastInboundAt = input.at
      }
      existing.status = statusOnInbound(existing.status)
      if (existing.status === 'open') existing.resolvedAt = null
      if (input.aiEnabled) {
        existing.aiStatus = 'pending'
        existing.aiNextAttemptAt = input.at
        existing.aiAttempts = 0
        existing.aiLastError = null
      }
    }
    existing.updatedAt = input.at
    return { status: 'appended', ticketId: existing.id }
  }
}

export class InMemoryReplyDeliveryRepository implements ReplyDeliveryRepository {
  constructor(
    private readonly tickets: InMemoryTicketRepository,
    private readonly messages: InMemoryMessageRepository,
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

export class InMemoryKbRepository implements KbRepository {
  readonly rows = new Map<string, KbArticle>()

  async create(article: KbArticle): Promise<void> {
    this.rows.set(article.id, clone(article))
  }

  async byId(id: string): Promise<KbArticle | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }

  async update(article: KbArticle, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(article.id)
    if (!current || current.version !== expectedVersion) return false
    article.version = expectedVersion + 1
    this.rows.set(article.id, clone(article))
    return true
  }

  async delete(id: string): Promise<boolean> {
    return this.rows.delete(id)
  }

  async list(filter: {
    limit: number
    offset: number
  }): Promise<{ items: KbArticle[]; total: number }> {
    const all = [...this.rows.values()].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    )
    return {
      items: all.slice(filter.offset, filter.offset + filter.limit).map(clone),
      total: all.length,
    }
  }

  async listPublished(): Promise<KbArticle[]> {
    return [...this.rows.values()]
      .filter((a) => a.published)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone)
  }
}

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
