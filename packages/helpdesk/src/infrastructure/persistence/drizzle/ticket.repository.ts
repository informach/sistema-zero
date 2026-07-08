import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type {
  AiClassificationUpdate,
  ListTicketsFilter,
  TicketRepository,
} from '../../../domain/ports/ticket-repository.port'
import type { Ticket } from '../../../domain/ticket/ticket'
import type { Database, DbConnection } from './db'
import { escapeLike } from './pg-errors'
import { tickets } from './schema'

export class DrizzleTicketRepository implements TicketRepository {
  private readonly db: Database

  constructor(private readonly connection: DbConnection) {
    this.db = connection.db
  }

  async create(ticket: Ticket): Promise<void> {
    await this.db.insert(tickets).values(ticket)
  }

  async byId(id: string): Promise<Ticket | null> {
    const [row] = await this.db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
    return row ?? null
  }

  async byGmailThreadId(threadId: string): Promise<Ticket | null> {
    const [row] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.gmailThreadId, threadId))
      .limit(1)
    return row ?? null
  }

  async update(ticket: Ticket, expectedVersion: number): Promise<boolean> {
    const updated = await this.db
      .update(tickets)
      .set({
        version: expectedVersion + 1,
        subject: ticket.subject,
        status: ticket.status,
        category: ticket.category,
        categoryManual: ticket.categoryManual,
        priority: ticket.priority,
        requesterName: ticket.requesterName,
        assignedTo: ticket.assignedTo,
        assignedToName: ticket.assignedToName,
        firstMessageAt: ticket.firstMessageAt,
        lastMessageAt: ticket.lastMessageAt,
        lastInboundAt: ticket.lastInboundAt,
        messageCount: ticket.messageCount,
        aiSummary: ticket.aiSummary,
        aiSummaryAt: ticket.aiSummaryAt,
        aiDraft: ticket.aiDraft,
        aiDraftAt: ticket.aiDraftAt,
        aiDraftEdited: ticket.aiDraftEdited,
        aiClassification: ticket.aiClassification,
        aiStatus: ticket.aiStatus,
        aiNextAttemptAt: ticket.aiNextAttemptAt,
        aiAttempts: ticket.aiAttempts,
        aiLastError: ticket.aiLastError,
        autoReplyState: ticket.autoReplyState,
        autoRepliedAt: ticket.autoRepliedAt,
        autoReplyReason: ticket.autoReplyReason,
        updatedAt: ticket.updatedAt,
      })
      .where(and(eq(tickets.id, ticket.id), eq(tickets.version, expectedVersion)))
      .returning({ id: tickets.id })
    const ok = updated.length > 0
    if (ok) ticket.version = expectedVersion + 1
    return ok
  }

  async claimForReply(id: string, expectedVersion: number, at: Date): Promise<boolean> {
    const claimed = await this.db
      .update(tickets)
      .set({ version: expectedVersion + 1, updatedAt: at })
      .where(and(eq(tickets.id, id), eq(tickets.version, expectedVersion)))
      .returning({ id: tickets.id })
    return claimed.length > 0
  }

  async list(filter: ListTicketsFilter): Promise<{ items: Ticket[]; total: number }> {
    const conditions = []
    if (filter.status) conditions.push(eq(tickets.status, filter.status))
    if (filter.category) conditions.push(eq(tickets.category, filter.category))
    if (filter.q) {
      const pattern = `%${escapeLike(filter.q)}%`
      conditions.push(
        or(
          ilike(tickets.subject, pattern),
          ilike(tickets.requesterEmail, pattern),
          ilike(sql`coalesce(${tickets.requesterName}, '')`, pattern),
        ),
      )
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(tickets)
        .where(where)
        // `id` como desempate: paginação estável quando `lastMessageAt` colide.
        .orderBy(desc(tickets.lastMessageAt), asc(tickets.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ value: count() }).from(tickets).where(where),
    ])
    return { items, total: totalRow?.value ?? 0 }
  }

  async claimAiDue(leaseMs: number, at: Date): Promise<Ticket | null> {
    // Claim atômico da fila de IA (espelha o claimDue da conexão). SKIP LOCKED
    // deixa réplicas concorrentes pegarem tickets diferentes; NÃO toca em `version`.
    // ⚠️ Date como param em SQL cru só via .toISOString() (Bun+postgres.js).
    const nowIso = at.toISOString()
    const leaseIso = new Date(at.getTime() + leaseMs).toISOString()
    const rows = await this.connection.sql`
      update helpdesk.tickets
      set ai_status = 'processing', ai_next_attempt_at = ${leaseIso}, ai_attempts = ai_attempts + 1
      where id = (
        select id from helpdesk.tickets
        where ai_status = 'pending' and ai_next_attempt_at <= ${nowIso}
        order by ai_next_attempt_at
        limit 1
        for update skip locked
      )
      returning id
    `
    const claimedId = rows[0]?.id as string | undefined
    if (!claimedId) return null
    return this.byId(claimedId)
  }

  async applyClassification(id: string, update: AiClassificationUpdate): Promise<void> {
    const at = update.at.toISOString()
    // Categoria só quando não é manual; prioridade só quando ainda é nula.
    await this.connection.sql`
      update helpdesk.tickets set
        ai_summary = ${update.summary},
        ai_summary_at = ${at},
        ai_classification = ${JSON.stringify(update.classification)}::jsonb,
        category = case when category_manual then category else ${update.category}::helpdesk.ticket_category end,
        priority = coalesce(priority, ${update.priority}::helpdesk.ticket_priority),
        updated_at = ${at}
      where id = ${id}
    `
  }

  async applyDraft(id: string, draft: string, at: Date): Promise<void> {
    const iso = at.toISOString()
    await this.connection.sql`
      update helpdesk.tickets set
        ai_draft = ${draft}, ai_draft_at = ${iso}, ai_draft_edited = false, updated_at = ${iso}
      where id = ${id}
    `
  }

  async markAiDone(id: string, at: Date): Promise<void> {
    const iso = at.toISOString()
    await this.connection.sql`
      update helpdesk.tickets set
        ai_status = 'done', ai_last_error = null, ai_next_attempt_at = null, ai_attempts = 0, updated_at = ${iso}
      where id = ${id}
    `
  }

  async scheduleAiRetry(id: string, nextAt: Date, error: string, at: Date): Promise<void> {
    await this.connection.sql`
      update helpdesk.tickets set
        ai_status = 'pending', ai_next_attempt_at = ${nextAt.toISOString()},
        ai_last_error = ${error.slice(0, 500)}, updated_at = ${at.toISOString()}
      where id = ${id}
    `
  }

  async markAiFailed(id: string, error: string, at: Date): Promise<void> {
    const iso = at.toISOString()
    await this.connection.sql`
      update helpdesk.tickets set
        ai_status = 'failed', ai_last_error = ${error.slice(0, 500)}, ai_next_attempt_at = null, updated_at = ${iso}
      where id = ${id}
    `
  }

  async claimAutoReply(id: string, at: Date): Promise<boolean> {
    const rows = await this.connection.sql`
      update helpdesk.tickets
      set auto_reply_state = 'sending', updated_at = ${at.toISOString()}
      where id = ${id} and auto_reply_state = 'none'
      returning id
    `
    return rows.length > 0
  }

  async finishAutoReply(
    id: string,
    state: 'sent' | 'aborted',
    reason: string | null,
    at: Date,
  ): Promise<void> {
    const iso = at.toISOString()
    await this.connection.sql`
      update helpdesk.tickets set
        auto_reply_state = ${state}::helpdesk.auto_reply_state,
        auto_reply_reason = ${reason},
        auto_replied_at = case when ${state} = 'sent' then ${iso}::timestamptz else auto_replied_at end,
        updated_at = ${iso}
      where id = ${id}
    `
  }

  async setAutoReplyReason(id: string, reason: string | null, at: Date): Promise<void> {
    await this.connection.sql`
      update helpdesk.tickets set auto_reply_reason = ${reason}, updated_at = ${at.toISOString()}
      where id = ${id}
    `
  }
}
