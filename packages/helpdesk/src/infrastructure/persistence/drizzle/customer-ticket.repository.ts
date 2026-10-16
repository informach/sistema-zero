import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm'
import { ConcurrencyConflictError } from '../../../domain/helpdesk-errors'
import type {
  CustomerTicketOwner,
  CustomerTicketRepository,
  CustomerTicketsFilter,
} from '../../../domain/ports/customer-ticket-repository.port'
import { commandHash } from '../../../domain/ticket/automation'
import {
  type HelpdeskTx,
  handoffTicket,
  lockAutomationPolicy,
  scheduleAutomation,
  supersedeJobs,
} from './automation-transactions'
import type { Database } from './db'
import { customerCommands, resolutionEvents, ticketMessages, tickets } from './schema'

/** Queries do portal. Ownership fica no WHERE, não apenas no service. */
export class DrizzleCustomerTicketRepository implements CustomerTicketRepository {
  constructor(private readonly db: Database) {}

  async command(input: Parameters<CustomerTicketRepository['command']>[0]) {
    return this.db.transaction(async (tx) => {
      await lockAutomationPolicy(tx)
      const hash = commandHash([input.action, input.ticketId])
      const [prior] = await tx
        .select()
        .from(customerCommands)
        .where(
          and(
            eq(customerCommands.accountId, input.owner.accountId),
            eq(customerCommands.key, input.commandKey),
          ),
        )
      if (prior && prior.hash !== hash)
        throw new ConcurrencyConflictError('Chave de idempotência já usada para outro pedido')
      const [ticket] = await tx
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, input.ticketId), this.ownedWhere(input.owner)))
        .for('update')
      if (!ticket) return null
      if (prior) return ticket
      let saved = ticket
      if (input.action === 'handoff')
        saved = await handoffTicket(tx, ticket, 'customer_requested', input.at)
      else if (!['resolved', 'closed'].includes(ticket.status)) {
        const [reply] = await tx
          .select({ id: ticketMessages.id })
          .from(ticketMessages)
          .where(
            and(
              eq(ticketMessages.ticketId, ticket.id),
              eq(ticketMessages.direction, 'outbound'),
              eq(ticketMessages.visibility, 'customer'),
              or(isNull(ticketMessages.deliveryState), eq(ticketMessages.deliveryState, 'sent')),
            ),
          )
          .limit(1)
        if (!reply)
          throw new ConcurrencyConflictError('Aguarde uma resposta antes de confirmar a resolução')
        const [updated] = await tx
          .update(tickets)
          .set({
            status: 'resolved',
            resolvedAt: input.at,
            handlingMode: 'human',
            humanTakeover: true,
            handlingEpoch: sql`${tickets.handlingEpoch}+1`,
            version: sql`${tickets.version}+1`,
            humanSlaStartedAt: null,
            updatedAt: input.at,
          })
          .where(eq(tickets.id, ticket.id))
          .returning()
        saved = updated ?? ticket
        await supersedeJobs(tx, ticket.id, input.at)
        await tx.insert(resolutionEvents).values({
          id: randomUUID(),
          ticketId: ticket.id,
          kind: 'confirmed',
          automated: ticket.handlingMode === 'assistant',
          generation: ticket.aiGeneration,
          createdAt: input.at,
        })
      }
      await tx.insert(customerCommands).values({
        id: randomUUID(),
        accountId: input.owner.accountId,
        key: input.commandKey,
        hash,
        ticketId: ticket.id,
        createdAt: input.at,
      })
      return saved
    })
  }

  async createWithInitialMessage(
    input: Parameters<CustomerTicketRepository['createWithInitialMessage']>[0],
  ) {
    return this.db.transaction(async (tx) => {
      const policy = await lockAutomationPolicy(tx)
      if (!input.ticket.requesterAccountId) throw new Error('Portal requester absent')
      const replay = await this.replay(
        tx,
        input.ticket.requesterAccountId,
        input.commandKey,
        input.commandHash,
      )
      if (replay) return replay
      await tx.insert(tickets).values(input.ticket)
      await tx.insert(ticketMessages).values(input.message)
      const ticket = await scheduleAutomation(
        tx,
        input.ticket,
        input.message.bodyText,
        input.message.createdAt,
        policy,
        input.aiEnabled,
        true,
      )
      await tx.insert(customerCommands).values({
        id: randomUUID(),
        accountId: input.ticket.requesterAccountId,
        key: input.commandKey,
        hash: input.commandHash,
        ticketId: ticket.id,
        messageId: input.message.id,
        createdAt: input.message.createdAt,
      })
      return { ticket, message: input.message }
    })
  }

  async listOwned(filter: CustomerTicketsFilter): Promise<{
    items: (typeof tickets.$inferSelect)[]
    total: number
  }> {
    const owned = this.ownedWhere(filter, filter.status)
    const afterCursor = filter.cursor
      ? or(
          lt(tickets.lastMessageAt, filter.cursor.lastMessageAt),
          and(
            eq(tickets.lastMessageAt, filter.cursor.lastMessageAt),
            gt(tickets.id, filter.cursor.id),
          ),
        )
      : undefined
    const where = afterCursor ? and(owned, afterCursor) : owned
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(tickets)
        .where(where)
        .orderBy(desc(tickets.lastMessageAt), asc(tickets.id))
        // Busca uma linha extra para dizer `hasMore` sem depender de `total`,
        // que pode mudar enquanto o usuário percorre a própria fila.
        .limit(filter.limit + 1),
      this.db.select({ value: count() }).from(tickets).where(owned),
    ])
    return { items, total: Number(totalRow?.value ?? 0) }
  }

  async byIdOwned(
    id: string,
    owner: CustomerTicketOwner,
  ): Promise<typeof tickets.$inferSelect | null> {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), this.ownedWhere(owner)))
      .limit(1)
    return ticket ?? null
  }

  async appendCustomerMessage(input: {
    ticketId: string
    owner: CustomerTicketOwner
    message: Parameters<CustomerTicketRepository['appendCustomerMessage']>[0]['message']
    at: Date
    aiEnabled: boolean
    commandKey: string
    commandHash: string
  }): Promise<{
    ticket: typeof tickets.$inferSelect
    message: typeof ticketMessages.$inferSelect
  } | null> {
    return this.db.transaction(async (tx) => {
      const policy = await lockAutomationPolicy(tx)
      const replay = await this.replay(
        tx,
        input.owner.accountId,
        input.commandKey,
        input.commandHash,
      )
      if (replay) return replay
      // postgres.js sob Bun exige ISO string dentro de SQL cru.
      const [previous] = await tx
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, input.ticketId), this.ownedWhere(input.owner)))
        .for('update')
      if (!previous) return null
      if (['resolved', 'closed'].includes(previous.status)) {
        const [confirmation] = previous.resolvedAt
          ? await tx
              .select({ automated: resolutionEvents.automated })
              .from(resolutionEvents)
              .where(
                and(
                  eq(resolutionEvents.ticketId, previous.id),
                  eq(resolutionEvents.kind, 'confirmed'),
                  eq(resolutionEvents.createdAt, previous.resolvedAt),
                ),
              )
              .limit(1)
          : []
        await tx.insert(resolutionEvents).values({
          id: randomUUID(),
          ticketId: previous.id,
          kind: 'reopened',
          automated: confirmation?.automated ?? false,
          generation: previous.aiGeneration,
          createdAt: input.at,
        })
      }
      const atIso = input.at.toISOString()
      const [ticket] = await tx
        .update(tickets)
        .set({
          version: sql`${tickets.version} + 1`,
          status: sql`case
            when ${tickets.status} in ('waiting', 'resolved', 'closed') then 'open'::helpdesk.ticket_status
            else ${tickets.status}
          end`,
          resolvedAt: sql`case
            when ${tickets.status} in ('resolved', 'closed') then null
            else ${tickets.resolvedAt}
          end`,
          messageCount: sql`${tickets.messageCount} + 1`,
          lastMessageAt: sql`greatest(${tickets.lastMessageAt}, ${atIso}::timestamptz)`,
          lastInboundAt: sql`greatest(coalesce(${tickets.lastInboundAt}, ${atIso}::timestamptz), ${atIso}::timestamptz)`,
          humanSlaStartedAt: sql`case when ${tickets.status} in ('waiting','resolved','closed') and ${tickets.handlingMode} = 'human' then null else ${tickets.humanSlaStartedAt} end`,
          humanTakeover: sql`case when ${tickets.status} in ('resolved','closed') then true else ${tickets.humanTakeover} end`,
          aiGeneration: sql`${tickets.aiGeneration} + 1`,
          aiSummary: null,
          aiSummaryAt: null,
          aiDraftRunId: null,
          aiDraft: null,
          aiDraftAt: null,
          aiDraftEdited: false,
          aiClassification: null,
          aiStatus: input.aiEnabled ? 'pending' : 'skipped',
          aiNextAttemptAt: input.aiEnabled ? input.at : null,
          aiAttempts: 0,
          aiLastError: null,
          updatedAt: input.at,
        })
        .where(and(eq(tickets.id, input.ticketId), this.ownedWhere(input.owner)))
        .returning()
      if (!ticket) return null

      const [message] = await tx.insert(ticketMessages).values(input.message).returning()
      const scheduled = await scheduleAutomation(
        tx,
        ticket,
        input.message.bodyText,
        input.at,
        policy,
        input.aiEnabled,
      )
      await tx.insert(customerCommands).values({
        id: randomUUID(),
        accountId: input.owner.accountId,
        key: input.commandKey,
        hash: input.commandHash,
        ticketId: ticket.id,
        messageId: input.message.id,
        createdAt: input.at,
      })
      return message ? { ticket: scheduled, message } : null
    })
  }

  private ownedWhere(owner: CustomerTicketOwner, status?: CustomerTicketsFilter['status']) {
    const ownership = or(
      eq(tickets.requesterAccountId, owner.accountId),
      and(
        isNull(tickets.requesterAccountId),
        sql`lower(${tickets.requesterEmail}) = lower(${owner.email})`,
      ),
    )
    return status ? and(ownership, eq(tickets.status, status)) : ownership
  }

  private async replay(tx: HelpdeskTx, accountId: string, key: string, hash: string) {
    const [command] = await tx
      .select()
      .from(customerCommands)
      .where(and(eq(customerCommands.accountId, accountId), eq(customerCommands.key, key)))
    if (!command) return null
    if (command.hash !== hash)
      throw new ConcurrencyConflictError('Chave de idempotência já usada para outro pedido')
    if (!command.messageId)
      throw new ConcurrencyConflictError('Chave de idempotência já usada para outro comando')
    const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, command.ticketId))
    const [message] = await tx
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.id, command.messageId))
    if (!ticket || !message) throw new ConcurrencyConflictError('Resultado do comando indisponível')
    return { ticket, message }
  }
}
