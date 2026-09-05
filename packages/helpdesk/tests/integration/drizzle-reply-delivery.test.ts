import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import type { PendingReplyMessage } from '../../src/domain/ports/reply-delivery-repository.port'
import type { TicketMessage } from '../../src/domain/ticket/ticket-message'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleReplyDeliveryRepository } from '../../src/infrastructure/persistence/drizzle/reply-delivery.repository'
import { ticketMessages, tickets } from '../../src/infrastructure/persistence/drizzle/schema'
import { makeMessage, makeTicket } from '../helpers'

const databaseUrl = process.env.HELPDESK_TEST_DATABASE_URL
const integration = databaseUrl ? describe : describe.skip

if (databaseUrl && !/helpdesk_test/i.test(databaseUrl)) {
  throw new Error('HELPDESK_TEST_DATABASE_URL deve apontar para um banco descartável helpdesk_test')
}

integration('DrizzleReplyDeliveryRepository', () => {
  let connection: DbConnection
  let repository: DrizzleReplyDeliveryRepository

  beforeAll(() => {
    if (!databaseUrl) return
    connection = createDbConnection(databaseUrl)
    repository = new DrizzleReplyDeliveryRepository(connection.db)
  })

  beforeEach(async () => {
    await connection.sql`truncate table helpdesk.ticket_messages, helpdesk.tickets cascade`
  })

  afterAll(async () => {
    await connection.close()
  })

  it('persiste a intenção antes do Gmail e contabiliza uma única vez ao confirmar', async () => {
    const ticket = makeTicket({ messageCount: 1 })
    await connection.db.insert(tickets).values(ticket)
    await connection.db.insert(ticketMessages).values(makeMessage(ticket.id))
    const pending: PendingReplyMessage = {
      ...makeMessage(ticket.id),
      gmailMessageId: null,
      rfc822MessageId: '<reply-intent@sistemazero.com.br>',
      direction: 'outbound',
      sentVia: 'human',
      deliveryState: 'pending',
      deliveryLastError: null,
    }

    const created = await repository.createIntent({
      ticketId: ticket.id,
      expectedVersion: 0,
      message: pending,
      at: ticket.createdAt,
    })
    expect(created.status).toBe('created')
    const [beforeConfirmation] = await connection.db.select().from(tickets)
    expect(beforeConfirmation?.messageCount).toBe(1)

    const delivered = await repository.markSent({
      messageId: pending.id,
      gmailMessageId: 'gm-reply-confirmed',
      gmailThreadId: ticket.gmailThreadId ?? 'thread-reply-confirmed',
      at: ticket.createdAt,
    })
    expect(delivered?.message.deliveryState).toBe('sent')
    expect(delivered?.ticket.messageCount).toBe(2)

    const [messageCount] = await connection.db
      .select({ count: sql<number>`count(*)` })
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticket.id))
    expect(Number(messageCount?.count)).toBe(2)
  })

  it('encerra uma falha conhecida e permite criar uma nova intenção', async () => {
    const ticket = makeTicket({ messageCount: 1 })
    await connection.db.insert(tickets).values(ticket)
    const failedIntent: PendingReplyMessage = {
      ...makeMessage(ticket.id),
      gmailMessageId: null,
      rfc822MessageId: '<reply-failed@sistemazero.com.br>',
      direction: 'outbound',
      sentVia: 'human',
      deliveryState: 'pending',
      deliveryLastError: null,
    }
    await repository.createIntent({
      ticketId: ticket.id,
      expectedVersion: 0,
      message: failedIntent,
      at: ticket.createdAt,
    })

    const failed = await repository.markFailed(failedIntent.id, 'Envio recusado pelo Gmail')
    expect(failed?.deliveryState).toBe('failed')
    expect(failed?.deliveryLastError).toBe('Envio recusado pelo Gmail')

    const retry: PendingReplyMessage = {
      ...makeMessage(ticket.id),
      gmailMessageId: null,
      rfc822MessageId: '<reply-retry@sistemazero.com.br>',
      direction: 'outbound',
      sentVia: 'human',
      deliveryState: 'pending',
      deliveryLastError: null,
    }
    const next = await repository.createIntent({
      ticketId: ticket.id,
      expectedVersion: 1,
      message: retry,
      at: ticket.createdAt,
    })
    expect(next.status).toBe('created')
  })

  it('não reverte uma resolução humana enquanto a confirmação do Gmail chega', async () => {
    const ticket = makeTicket({ messageCount: 1 })
    await connection.db.insert(tickets).values(ticket)
    const pending: PendingReplyMessage = {
      ...makeMessage(ticket.id),
      gmailMessageId: null,
      rfc822MessageId: '<reply-resolved-race@sistemazero.com.br>',
      direction: 'outbound',
      sentVia: 'human',
      deliveryState: 'pending',
      deliveryLastError: null,
    }
    await repository.createIntent({
      ticketId: ticket.id,
      expectedVersion: 0,
      message: pending,
      at: ticket.createdAt,
    })
    await connection.db
      .update(tickets)
      .set({ status: 'resolved', resolvedAt: ticket.createdAt })
      .where(eq(tickets.id, ticket.id))

    const delivered = await repository.markSent({
      messageId: pending.id,
      gmailMessageId: 'gm-resolved-race',
      gmailThreadId: ticket.gmailThreadId ?? 'thread-resolved-race',
      at: ticket.createdAt,
    })

    expect(delivered?.ticket.status).toBe('resolved')
    expect(delivered?.ticket.resolvedAt).toEqual(ticket.createdAt)
  })

  it('resposta do PORTAL grava a mensagem e move o ticket numa transação só; version velha não insere nada', async () => {
    const ticket = makeTicket({
      messageCount: 1,
      source: 'portal',
      portal: 'kids',
      gmailThreadId: null,
    })
    await connection.db.insert(tickets).values(ticket)
    await connection.db.insert(ticketMessages).values(
      makeMessage(ticket.id, {
        kind: 'portal',
        gmailMessageId: null,
        rfc822MessageId: null,
        sentVia: 'customer',
        deliveryState: null,
      }),
    )
    const portalReply = (): TicketMessage =>
      makeMessage(ticket.id, {
        kind: 'portal',
        gmailMessageId: null,
        rfc822MessageId: null,
        direction: 'outbound',
        sentVia: 'human',
        deliveryState: null,
        fromEmail: null,
      })
    const at = new Date(ticket.createdAt.getTime() + 60_000)

    const created = await repository.appendPortalReply({
      ticketId: ticket.id,
      expectedVersion: 0,
      message: portalReply(),
      at,
    })
    expect(created.status).toBe('created')
    if (created.status !== 'created') throw new Error('unreachable')
    // Um passo só: CAS em version (+1, não +2), `waiting`, contadores, sem thread.
    expect(created.ticket.version).toBe(1)
    expect(created.ticket.status).toBe('waiting')
    expect(created.ticket.messageCount).toBe(2)
    expect(created.ticket.lastMessageAt).toEqual(at)
    expect(created.ticket.gmailThreadId).toBeNull()

    const stale = await repository.appendPortalReply({
      ticketId: ticket.id,
      expectedVersion: 0,
      message: portalReply(),
      at,
    })
    expect(stale.status).toBe('conflict')
    const [count] = await connection.db
      .select({ count: sql<number>`count(*)` })
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticket.id))
    expect(Number(count?.count)).toBe(2)
    const [row] = await connection.db.select().from(tickets).where(eq(tickets.id, ticket.id))
    expect(row?.version).toBe(1)
  })

  it('resposta do PORTAL recusa enquanto houver entrega Gmail em voo no ticket', async () => {
    const ticket = makeTicket({
      messageCount: 1,
      source: 'portal',
      portal: 'adult',
      gmailThreadId: null,
    })
    await connection.db.insert(tickets).values(ticket)
    const inFlight: PendingReplyMessage = {
      ...makeMessage(ticket.id),
      gmailMessageId: null,
      rfc822MessageId: '<in-flight@sistemazero.com.br>',
      direction: 'outbound',
      sentVia: 'human',
      deliveryState: 'pending',
      deliveryLastError: null,
    }
    await repository.createIntent({
      ticketId: ticket.id,
      expectedVersion: 0,
      message: inFlight,
      at: ticket.createdAt,
    })

    const blocked = await repository.appendPortalReply({
      ticketId: ticket.id,
      expectedVersion: 1,
      message: makeMessage(ticket.id, {
        kind: 'portal',
        gmailMessageId: null,
        rfc822MessageId: null,
        direction: 'outbound',
        sentVia: 'human',
        deliveryState: null,
      }),
      at: ticket.createdAt,
    })
    expect(blocked.status).toBe('pending')
  })
})
