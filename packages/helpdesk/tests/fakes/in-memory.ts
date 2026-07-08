import type { GmailConnection } from '../../src/domain/connection/gmail-connection'
import type { KbArticle } from '../../src/domain/kb/kb-article'
import type { ConnectionRepository } from '../../src/domain/ports/connection-repository.port'
import type { KbRepository } from '../../src/domain/ports/kb-repository.port'
import type { MessageRepository } from '../../src/domain/ports/message-repository.port'
import type {
  OAuthState,
  OAuthStateRepository,
} from '../../src/domain/ports/oauth-state-repository.port'
import type { SettingsRepository } from '../../src/domain/ports/settings-repository.port'
import type {
  AiClassificationUpdate,
  ListTicketsFilter,
  TicketRepository,
} from '../../src/domain/ports/ticket-repository.port'
import { DEFAULT_SETTINGS, type HelpdeskSettings } from '../../src/domain/settings/settings'
import type { Ticket } from '../../src/domain/ticket/ticket'
import type { TicketMessage } from '../../src/domain/ticket/ticket-message'
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

  async byGmailThreadId(threadId: string): Promise<Ticket | null> {
    for (const row of this.rows.values()) {
      if (row.gmailThreadId === threadId) return clone(row)
    }
    return null
  }

  async update(ticket: Ticket, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(ticket.id)
    if (!current || current.version !== expectedVersion) return false
    ticket.version = expectedVersion + 1
    this.rows.set(ticket.id, clone(ticket))
    return true
  }

  async claimForReply(id: string, expectedVersion: number, at: Date): Promise<boolean> {
    const current = this.rows.get(id)
    if (!current || current.version !== expectedVersion) return false
    current.version = expectedVersion + 1
    current.updatedAt = at
    return true
  }

  async list(filter: ListTicketsFilter): Promise<{ items: Ticket[]; total: number }> {
    const q = filter.q?.toLowerCase()
    const all = [...this.rows.values()]
      .filter((t) => !filter.status || t.status === filter.status)
      .filter((t) => !filter.category || t.category === filter.category)
      .filter(
        (t) =>
          !q ||
          t.subject.toLowerCase().includes(q) ||
          t.requesterEmail.toLowerCase().includes(q) ||
          (t.requesterName ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
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
    const autoByDay = new Map<string, number>()
    for (const t of all) {
      if (t.createdAt.getTime() >= seriesStart) {
        const k = spDayKey(t.createdAt)
        createdByDay.set(k, (createdByDay.get(k) ?? 0) + 1)
      }
      if (t.autoRepliedAt && t.autoRepliedAt.getTime() >= seriesStart) {
        const k = spDayKey(t.autoRepliedAt)
        autoByDay.set(k, (autoByDay.get(k) ?? 0) + 1)
      }
    }
    const resolved = (since: number) =>
      all.filter(
        (t) => (t.status === 'resolved' || t.status === 'closed') && t.updatedAt.getTime() >= since,
      ).length
    const autoReplied = (since: number) =>
      all.filter((t) => t.autoRepliedAt !== null && t.autoRepliedAt.getTime() >= since).length
    return {
      counts: {
        new: all.filter((t) => t.status === 'new').length,
        open: all.filter((t) => t.status === 'open').length,
        waiting: all.filter((t) => t.status === 'waiting').length,
      },
      resolvedToday: resolved(todayStart),
      resolved7d: resolved(weekStart),
      autoRepliedToday: autoReplied(todayStart),
      autoReplied7d: autoReplied(weekStart),
      volume: densifyVolume(w.dayKeys, createdByDay, autoByDay),
    }
  }

  async claimAiDue(leaseMs: number, at: Date): Promise<Ticket | null> {
    const due = [...this.rows.values()]
      .filter(
        (t) =>
          t.aiStatus === 'pending' &&
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

  async claimAutoReply(id: string, at: Date): Promise<boolean> {
    const t = this.rows.get(id)
    if (t?.autoReplyState !== 'none') return false
    t.autoReplyState = 'sending'
    t.updatedAt = at
    return true
  }

  async finishAutoReply(
    id: string,
    state: 'sent' | 'aborted',
    reason: string | null,
    at: Date,
  ): Promise<void> {
    const t = this.rows.get(id)
    if (!t) return
    t.autoReplyState = state
    t.autoReplyReason = reason
    if (state === 'sent') t.autoRepliedAt = at
    t.updatedAt = at
  }

  async setAutoReplyReason(id: string, reason: string | null, at: Date): Promise<void> {
    const t = this.rows.get(id)
    if (!t) return
    t.autoReplyReason = reason
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

  async existsByGmailMessageId(gmailMessageId: string): Promise<boolean> {
    return this.rows.some((m) => m.gmailMessageId === gmailMessageId)
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

  async create(connection: GmailConnection): Promise<void> {
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
