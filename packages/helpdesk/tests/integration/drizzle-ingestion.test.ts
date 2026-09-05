import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import type { IngestedGmailMessage } from '../../src/domain/ports/ticket-ingestion-repository.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { ticketMessages, tickets } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleTicketIngestionRepository } from '../../src/infrastructure/persistence/drizzle/ticket-ingestion.repository'
import { makeMessage, makeTicket } from '../helpers'

const databaseUrl = process.env.HELPDESK_TEST_DATABASE_URL
const integration = databaseUrl ? describe : describe.skip

if (databaseUrl && !/helpdesk_test/i.test(databaseUrl)) {
  throw new Error('HELPDESK_TEST_DATABASE_URL deve apontar para um banco descartável helpdesk_test')
}

integration('DrizzleTicketIngestionRepository', () => {
  let connection: DbConnection
  let repository: DrizzleTicketIngestionRepository

  beforeAll(() => {
    if (!databaseUrl) return
    connection = createDbConnection(databaseUrl)
    repository = new DrizzleTicketIngestionRepository(connection.db)
  })

  beforeEach(async () => {
    await connection.sql`truncate table helpdesk.ticket_messages, helpdesk.tickets cascade`
  })

  afterAll(async () => {
    await connection.close()
  })

  it('serializa a mesma mensagem concorrente sem duplicar ticket, mensagem ou contador', async () => {
    const ticket = makeTicket()
    const message = { ...makeMessage(ticket.id), gmailMessageId: `gmail-${randomUUID()}` }
    const input = {
      ticket,
      message,
      direction: 'inbound' as const,
      aiEnabled: true,
      at: ticket.createdAt,
    }

    const [first, second] = await Promise.all([repository.ingest(input), repository.ingest(input)])

    expect([first.status, second.status].sort()).toEqual(['created', 'duplicate'])
    const [ticketCount] = await connection.db.select({ count: sql<number>`count(*)` }).from(tickets)
    const [messageCount] = await connection.db
      .select({ count: sql<number>`count(*)` })
      .from(ticketMessages)
    expect(Number(ticketCount?.count)).toBe(1)
    expect(Number(messageCount?.count)).toBe(1)
    const [storedTicket] = await connection.db.select().from(tickets)
    expect(storedTicket?.messageCount).toBe(1)
  })

  it('faz rollback do ticket quando a inserção da mensagem falha', async () => {
    const existing = makeTicket()
    const conflictingMessage = makeMessage(existing.id)
    await connection.db.insert(tickets).values(existing)
    await connection.db.insert(ticketMessages).values(conflictingMessage)

    const candidate = makeTicket()
    const input = {
      ticket: candidate,
      message: {
        ...makeMessage(candidate.id),
        id: conflictingMessage.id,
        gmailMessageId: `gmail-${randomUUID()}`,
      },
      direction: 'inbound' as const,
      aiEnabled: false,
      at: candidate.createdAt,
    }

    await expect(repository.ingest(input)).rejects.toThrow()

    const rows = await connection.db
      .select({ id: tickets.id })
      .from(tickets)
      .where(eq(tickets.gmailThreadId, candidate.gmailThreadId!))
    expect(rows).toHaveLength(0)
  })

  it('vincula a confirmação da primeira resposta a um ticket do portal', async () => {
    const ticket = makeTicket({
      source: 'portal',
      gmailThreadId: null,
      status: 'new',
      messageCount: 1,
    })
    const initial = makeMessage(ticket.id, {
      kind: 'portal',
      gmailMessageId: null,
      rfc822MessageId: null,
      deliveryState: null,
      direction: 'inbound',
      sentVia: 'customer',
    })
    const pending = makeMessage(ticket.id, {
      gmailMessageId: null,
      rfc822MessageId: '<portal-first-reply@sistemazero.com.br>',
      deliveryState: 'pending',
      direction: 'outbound',
      sentVia: 'human',
    })
    await connection.db.insert(tickets).values(ticket)
    await connection.db.insert(ticketMessages).values([initial, pending])

    const ingestedTicket = makeTicket({ gmailThreadId: 'gmail-thread-after-first-reply' })
    const result = await repository.ingest({
      ticket: ingestedTicket,
      message: {
        ...makeMessage(ingestedTicket.id, {
          gmailMessageId: 'gm-portal-first-reply',
          rfc822MessageId: '<portal-first-reply@sistemazero.com.br>',
          direction: 'outbound',
          sentVia: 'gmail',
        }),
        gmailMessageId: 'gm-portal-first-reply',
      } satisfies IngestedGmailMessage,
      direction: 'outbound',
      aiEnabled: false,
      at: ticket.createdAt,
    })

    expect(result).toEqual({ status: 'appended', ticketId: ticket.id })
    const [stored] = await connection.db.select().from(tickets).where(eq(tickets.id, ticket.id))
    expect(stored).toMatchObject({
      gmailThreadId: 'gmail-thread-after-first-reply',
      status: 'waiting',
      messageCount: 2,
    })
  })
})
