import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { ticketQueuePosition } from '../../src/domain/ticket/ticket-sla'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { tickets } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleTicketRepository } from '../../src/infrastructure/persistence/drizzle/ticket.repository'
import { makeTicket } from '../helpers'

const databaseUrl = process.env.HELPDESK_TEST_DATABASE_URL
const integration = databaseUrl ? describe : describe.skip

if (databaseUrl && !/helpdesk_test/i.test(databaseUrl)) {
  throw new Error('HELPDESK_TEST_DATABASE_URL deve apontar para um banco descartável helpdesk_test')
}

integration('DrizzleTicketRepository', () => {
  let connection: DbConnection
  let repository: DrizzleTicketRepository

  beforeAll(() => {
    if (!databaseUrl) return
    connection = createDbConnection(databaseUrl)
    repository = new DrizzleTicketRepository(connection)
  })

  beforeEach(async () => {
    await connection.sql`truncate table helpdesk.ticket_messages, helpdesk.tickets cascade`
  })

  afterAll(async () => {
    await connection.close()
  })

  it('filters, orders, and aggregates the SLA queue in PostgreSQL', async () => {
    const now = new Date('2026-09-01T12:00:00.000Z')
    const breached = makeTicket({
      subject: 'Estourado',
      firstMessageAt: new Date('2026-08-31T23:00:00.000Z'),
      lastInboundAt: new Date('2026-08-31T23:00:00.000Z'),
      lastMessageAt: new Date('2026-08-31T23:00:00.000Z'),
    })
    const atRisk = makeTicket({
      subject: 'Em risco',
      firstMessageAt: new Date('2026-09-01T02:00:00.000Z'),
      lastInboundAt: new Date('2026-09-01T02:00:00.000Z'),
      lastMessageAt: new Date('2026-09-01T02:00:00.000Z'),
    })
    const assigned = makeTicket({
      subject: 'No prazo e atribuído',
      assignedTo: '33333333-3333-4333-8333-333333333333',
      assignedToName: 'Rafa',
      firstMessageAt: new Date('2026-09-01T11:00:00.000Z'),
      lastInboundAt: new Date('2026-09-01T11:00:00.000Z'),
      lastMessageAt: new Date('2026-09-01T11:00:00.000Z'),
    })
    const resolvedUnassigned = makeTicket({
      subject: 'Resolvido sem responsável',
      status: 'resolved',
      firstMessageAt: new Date('2026-09-01T11:00:00.000Z'),
      lastInboundAt: new Date('2026-09-01T11:00:00.000Z'),
      lastMessageAt: new Date('2026-09-01T11:00:00.000Z'),
    })
    await Promise.all([
      repository.create(breached),
      repository.create(atRisk),
      repository.create(assigned),
      repository.create(resolvedUnassigned),
    ])

    const attention = await repository.list({ sla: 'attention', limit: 50, cursor: null }, now)
    expect(attention.items.map((ticket) => ticket.id)).toEqual([breached.id, atRisk.id])

    const unassigned = await repository.list(
      { assignment: 'unassigned', limit: 50, cursor: null },
      now,
    )
    expect(unassigned.items.map((ticket) => ticket.id)).toEqual([
      breached.id,
      atRisk.id,
      resolvedUnassigned.id,
    ])

    const queue = await repository.list({ queue: 'unassigned', limit: 50, cursor: null }, now)
    expect(queue.items.map((ticket) => ticket.id)).toEqual([breached.id, atRisk.id])

    const stats = await repository.stats(now)
    expect(stats).toMatchObject({
      sla: { breached: 1, atRisk: 1, unassigned: 2 },
    })
  })

  it('pagina a fila pela tupla completa e não admite tickets criados depois do snapshot', async () => {
    const snapshotAt = new Date('2026-09-01T12:00:00.000Z')
    const queue = [3, 2, 1].map((hoursAgo) => {
      const at = new Date(snapshotAt.getTime() - hoursAgo * 60 * 60_000)
      return makeTicket({
        firstMessageAt: at,
        lastInboundAt: at,
        lastMessageAt: at,
        createdAt: at,
        updatedAt: at,
      })
    })
    await Promise.all(queue.map((ticket) => repository.create(ticket)))

    const firstPage = await repository.list({ limit: 2, cursor: null }, snapshotAt)
    const firstItems = firstPage.items.slice(0, 2)
    const last = firstItems.at(-1)!
    const position = ticketQueuePosition(last, snapshotAt)

    const createdAfterSnapshot = makeTicket({
      firstMessageAt: new Date('2026-08-01T00:00:00Z'),
      lastInboundAt: new Date('2026-08-01T00:00:00Z'),
      lastMessageAt: new Date('2026-08-01T00:00:00Z'),
      createdAt: new Date(snapshotAt.getTime() + 1),
      updatedAt: new Date(snapshotAt.getTime() + 1),
    })
    await repository.create(createdAfterSnapshot)

    const secondPage = await repository.list(
      {
        limit: 2,
        cursor: {
          snapshotAt,
          operationalRank: position.operationalRank,
          deadlineAt: position.deadlineAt,
          lastMessageAt: last.lastMessageAt,
          id: last.id,
        },
      },
      snapshotAt,
    )

    expect(firstItems.map((ticket) => ticket.id)).toEqual(
      queue.slice(0, 2).map((ticket) => ticket.id),
    )
    expect(secondPage.items.map((ticket) => ticket.id)).toEqual([queue[2]!.id])
    expect(secondPage.total).toBe(3)
  })

  it('recusa a conclusão de IA calculada para uma geração anterior', async () => {
    const at = new Date('2026-09-01T12:00:00.000Z')
    const ticket = makeTicket({
      aiGeneration: 1,
      aiStatus: 'processing',
      aiAttempts: 1,
      aiNextAttemptAt: new Date(at.getTime() + 60_000),
    })
    await repository.create(ticket)

    await connection.db
      .update(tickets)
      .set({
        aiGeneration: 2,
        aiStatus: 'pending',
        aiAttempts: 0,
        aiNextAttemptAt: at,
      })
      .where(eq(tickets.id, ticket.id))

    const staleGuard = { generation: 1, processingAttempt: 1 }
    expect(await repository.applyDraft(ticket.id, staleGuard, 'rascunho obsoleto', at)).toBe(false)
    expect(await repository.markAiDone(ticket.id, staleGuard, at)).toBe(false)
    expect(await repository.byId(ticket.id)).toMatchObject({
      aiGeneration: 2,
      aiStatus: 'pending',
      aiDraft: null,
    })
  })
})
