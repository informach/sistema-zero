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
  ListTicketsFilter,
  TicketRepository,
} from '../../src/domain/ports/ticket-repository.port'
import { DEFAULT_SETTINGS, type HelpdeskSettings } from '../../src/domain/settings/settings'
import type { Ticket } from '../../src/domain/ticket/ticket'
import type { TicketMessage } from '../../src/domain/ticket/ticket-message'

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
