import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePortalNotificationOutboxRepository } from '../../src/infrastructure/persistence/drizzle/portal-notification-outbox.repository'
import {
  portalNotificationOutbox,
  ticketMessages,
  tickets,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { makeMessage, makeTicket } from '../helpers'

const databaseUrl = process.env.HELPDESK_TEST_DATABASE_URL
const integration = databaseUrl ? describe : describe.skip

if (databaseUrl && !/helpdesk_test/i.test(databaseUrl)) {
  throw new Error('HELPDESK_TEST_DATABASE_URL deve apontar para um banco descartável helpdesk_test')
}

integration('DrizzlePortalNotificationOutboxRepository', () => {
  let connection: DbConnection
  let repository: DrizzlePortalNotificationOutboxRepository

  beforeAll(() => {
    if (!databaseUrl) return
    connection = createDbConnection(databaseUrl)
    repository = new DrizzlePortalNotificationOutboxRepository(connection.db)
  })

  beforeEach(async () => {
    await connection.sql`truncate table helpdesk.ticket_messages, helpdesk.tickets cascade`
  })

  afterAll(async () => {
    await connection.close()
  })

  it('faz claim com lease, retry e CAS até marcar a entrega', async () => {
    const now = new Date('2026-09-05T12:00:00Z')
    const ticket = makeTicket({ source: 'portal', gmailThreadId: null })
    const message = makeMessage(ticket.id, {
      kind: 'portal',
      gmailMessageId: null,
      rfc822MessageId: null,
      direction: 'outbound',
      deliveryState: null,
    })
    const id = randomUUID()
    await connection.db.insert(tickets).values(ticket)
    await connection.db.insert(ticketMessages).values(message)
    await connection.db.insert(portalNotificationOutbox).values({
      id,
      ticketId: ticket.id,
      messageId: message.id,
      payload: {
        templateKey: 'helpdesk-reply',
        recipient: { name: 'Maria', email: 'maria@example.com' },
        variables: { saudacao: 'Olá, Maria!', assunto: ticket.subject, link: 'https://app/ajuda' },
        idempotencyKey: `helpdesk-reply:${message.id}`,
      },
      status: 'pending',
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    })

    const firstClaim = await repository.claimDue(30_000, now)
    expect(firstClaim).toMatchObject({ id, status: 'processing', attempts: 1 })
    expect(firstClaim?.leaseExpiresAt).toEqual(new Date(now.getTime() + 30_000))
    expect(await repository.markSent(id, 0, now)).toBe(false)

    const retryAt = new Date(now.getTime() + 5_000)
    expect(await repository.scheduleRetry(id, 1, retryAt, 'gateway indisponível', now)).toBe(true)
    expect(await repository.claimDue(30_000, new Date(retryAt.getTime() - 1))).toBeNull()

    const secondClaim = await repository.claimDue(30_000, retryAt)
    expect(secondClaim).toMatchObject({ id, status: 'processing', attempts: 2 })
    expect(secondClaim?.payload.idempotencyKey).toBe(`helpdesk-reply:${message.id}`)
    expect(await repository.markSent(id, 2, retryAt)).toBe(true)
    expect(await repository.claimDue(30_000, retryAt)).toBeNull()
  })

  it('entrega o mesmo item a somente um claim concorrente', async () => {
    const now = new Date('2026-09-05T12:00:00Z')
    const ticket = makeTicket({ source: 'portal', gmailThreadId: null })
    const message = makeMessage(ticket.id, {
      kind: 'portal',
      gmailMessageId: null,
      rfc822MessageId: null,
      direction: 'outbound',
      deliveryState: null,
    })
    const id = randomUUID()
    await connection.db.insert(tickets).values(ticket)
    await connection.db.insert(ticketMessages).values(message)
    await connection.db.insert(portalNotificationOutbox).values({
      id,
      ticketId: ticket.id,
      messageId: message.id,
      payload: {
        templateKey: 'helpdesk-reply',
        recipient: { name: 'Maria', email: 'maria@example.com' },
        variables: { saudacao: 'Olá!', assunto: ticket.subject, link: 'https://app/ajuda' },
        idempotencyKey: `helpdesk-reply:${message.id}`,
      },
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    })

    const claims = await Promise.all([
      repository.claimDue(30_000, now),
      repository.claimDue(30_000, now),
    ])
    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(claims.find(Boolean)).toMatchObject({ id, attempts: 1, status: 'processing' })
  })
})
