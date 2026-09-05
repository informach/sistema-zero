import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleTicketRepository } from '../../src/infrastructure/persistence/drizzle/ticket.repository'
import { makeTicket } from '../helpers'

const databaseUrl = process.env.HELPDESK_TEST_DATABASE_URL
const integration = databaseUrl ? describe : describe.skip

if (databaseUrl && !/helpdesk_test/i.test(databaseUrl)) {
  throw new Error('HELPDESK_TEST_DATABASE_URL deve apontar para um banco descartável helpdesk_test')
}

integration('DrizzleTicketRepository SLA', () => {
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

    const attention = await repository.list({ sla: 'attention', limit: 50, offset: 0 }, now)
    expect(attention.items.map((ticket) => ticket.id)).toEqual([breached.id, atRisk.id])

    const unassigned = await repository.list(
      { assignment: 'unassigned', limit: 50, offset: 0 },
      now,
    )
    expect(unassigned.items.map((ticket) => ticket.id)).toEqual([
      breached.id,
      atRisk.id,
      resolvedUnassigned.id,
    ])

    const queue = await repository.list({ queue: 'unassigned', limit: 50, offset: 0 }, now)
    expect(queue.items.map((ticket) => ticket.id)).toEqual([breached.id, atRisk.id])

    const stats = await repository.stats(now)
    expect(stats).toMatchObject({
      sla: { breached: 1, atRisk: 1, unassigned: 2 },
    })
  })
})
