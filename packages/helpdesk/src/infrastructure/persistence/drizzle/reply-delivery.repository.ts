import { and, eq, inArray, sql } from 'drizzle-orm'
import type {
  AppendPortalReplyResult,
  CreateReplyIntentResult,
  ReplyDeliveryRepository,
} from '../../../domain/ports/reply-delivery-repository.port'
import type { TicketMessage } from '../../../domain/ticket/ticket-message'
import type { Database } from './db'
import { ticketMessages, tickets } from './schema'

export class DrizzleReplyDeliveryRepository implements ReplyDeliveryRepository {
  constructor(private readonly db: Database) {}

  async createIntent(input: {
    ticketId: string
    expectedVersion: number
    message: Parameters<ReplyDeliveryRepository['createIntent']>[0]['message']
    at: Date
  }): Promise<CreateReplyIntentResult> {
    return this.db.transaction(async (tx) => {
      const [ticket] = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.id, input.ticketId))
        .limit(1)
      if (!ticket) return { status: 'not_found' }

      const [activeDelivery] = await tx
        .select({ id: ticketMessages.id })
        .from(ticketMessages)
        .where(
          and(
            eq(ticketMessages.ticketId, input.ticketId),
            inArray(ticketMessages.deliveryState, ['pending', 'unknown']),
          ),
        )
        .limit(1)
      if (activeDelivery) return { status: 'pending' }

      const [claimedTicket] = await tx
        .update(tickets)
        .set({ version: input.expectedVersion + 1, updatedAt: input.at })
        .where(and(eq(tickets.id, input.ticketId), eq(tickets.version, input.expectedVersion)))
        .returning()
      if (!claimedTicket) return { status: 'conflict' }

      await tx.insert(ticketMessages).values(input.message)
      return { status: 'created', intent: { ticket: claimedTicket, message: input.message } }
    })
  }

  async markSent(input: {
    messageId: string
    gmailMessageId: string
    gmailThreadId: string
    at: Date
  }): Promise<{
    ticket: typeof tickets.$inferSelect
    message: typeof ticketMessages.$inferSelect
  } | null> {
    return this.db.transaction(async (tx) => {
      // postgres.js sob Bun exige ISO string em parâmetros dentro de SQL cru.
      const atIso = input.at.toISOString()
      const [updatedMessage] = await tx
        .update(ticketMessages)
        .set({
          gmailMessageId: input.gmailMessageId,
          deliveryState: 'sent',
          deliveryLastError: null,
          gmailInternalDate: input.at,
        })
        // A condição faz a transição ser compare-and-set: uma decisão humana
        // `markFailed` que venceu a corrida não pode ser sobrescrita por uma
        // confirmação tardia do transporte.
        .where(
          and(
            eq(ticketMessages.id, input.messageId),
            inArray(ticketMessages.deliveryState, ['pending', 'unknown']),
          ),
        )
        .returning()
      if (!updatedMessage) {
        // Idempotência: repetir uma confirmação já gravada devolve a projeção
        // atual, mas qualquer outro estado terminal continua sendo conflito.
        const [message] = await tx
          .select()
          .from(ticketMessages)
          .where(eq(ticketMessages.id, input.messageId))
          .limit(1)
        if (message?.deliveryState !== 'sent') return null
        const [ticket] = await tx
          .select()
          .from(tickets)
          .where(eq(tickets.id, message.ticketId))
          .limit(1)
        return ticket ? { ticket, message } : null
      }

      const [updatedTicket] = await tx
        .update(tickets)
        .set({
          version: sql`${tickets.version} + 1`,
          gmailThreadId: sql`coalesce(${tickets.gmailThreadId}, ${input.gmailThreadId})`,
          // Uma resolução humana posterior ao envio não pode ser revertida por
          // uma confirmação assíncrona. No fluxo normal (new/open), a resposta
          // muda o ticket para aguardar o cliente.
          status: sql`case
            when ${tickets.status} in ('new', 'open') then 'waiting'::helpdesk.ticket_status
            else ${tickets.status}
          end`,
          messageCount: sql`${tickets.messageCount} + 1`,
          lastMessageAt: sql`greatest(${tickets.lastMessageAt}, ${atIso})`,
          updatedAt: input.at,
        })
        .where(eq(tickets.id, updatedMessage.ticketId))
        .returning()
      return updatedTicket ? { ticket: updatedTicket, message: updatedMessage } : null
    })
  }

  async appendPortalReply(input: {
    ticketId: string
    expectedVersion: number
    message: TicketMessage
    at: Date
  }): Promise<AppendPortalReplyResult> {
    return this.db.transaction(async (tx) => {
      const [ticket] = await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.id, input.ticketId))
        .limit(1)
      if (!ticket) return { status: 'not_found' }

      // Mesmo guarda do createIntent: uma saída em voo por ticket, seja qual for
      // o canal — uma entrega Gmail `unknown` ainda pode aparecer depois.
      const [activeDelivery] = await tx
        .select({ id: ticketMessages.id })
        .from(ticketMessages)
        .where(
          and(
            eq(ticketMessages.ticketId, input.ticketId),
            inArray(ticketMessages.deliveryState, ['pending', 'unknown']),
          ),
        )
        .limit(1)
      if (activeDelivery) return { status: 'pending' }

      // postgres.js sob Bun exige ISO string em parâmetros dentro de SQL cru.
      const atIso = input.at.toISOString()
      // Intenção e confirmação num passo só (não há transporte): o CAS em `version`
      // é o do createIntent e a projeção do ticket é a do markSent, sem thread.
      const [updatedTicket] = await tx
        .update(tickets)
        .set({
          version: input.expectedVersion + 1,
          status: sql`case
            when ${tickets.status} in ('new', 'open') then 'waiting'::helpdesk.ticket_status
            else ${tickets.status}
          end`,
          messageCount: sql`${tickets.messageCount} + 1`,
          lastMessageAt: sql`greatest(${tickets.lastMessageAt}, ${atIso})`,
          updatedAt: input.at,
        })
        .where(and(eq(tickets.id, input.ticketId), eq(tickets.version, input.expectedVersion)))
        .returning()
      if (!updatedTicket) return { status: 'conflict' }

      await tx.insert(ticketMessages).values(input.message)
      return { status: 'created', ticket: updatedTicket, message: input.message }
    })
  }

  async markUnknown(messageId: string, error: string): Promise<void> {
    await this.db
      .update(ticketMessages)
      .set({ deliveryState: 'unknown', deliveryLastError: error.slice(0, 500) })
      .where(and(eq(ticketMessages.id, messageId), eq(ticketMessages.deliveryState, 'pending')))
  }

  async markFailed(
    messageId: string,
    error: string,
  ): Promise<typeof ticketMessages.$inferSelect | null> {
    const [message] = await this.db
      .update(ticketMessages)
      .set({ deliveryState: 'failed', deliveryLastError: error.slice(0, 500) })
      .where(
        and(
          eq(ticketMessages.id, messageId),
          inArray(ticketMessages.deliveryState, ['pending', 'unknown']),
        ),
      )
      .returning()
    return message ?? null
  }
}
