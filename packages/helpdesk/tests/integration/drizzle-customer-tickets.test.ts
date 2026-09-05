import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DrizzleCustomerTicketRepository } from '../../src/infrastructure/persistence/drizzle/customer-ticket.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { makeMessage, makeTicket } from '../helpers'

const databaseUrl = process.env.HELPDESK_TEST_DATABASE_URL
const integration = databaseUrl ? describe : describe.skip

if (databaseUrl && !/helpdesk_test/i.test(databaseUrl)) {
  throw new Error('HELPDESK_TEST_DATABASE_URL deve apontar para um banco descartável helpdesk_test')
}

integration('DrizzleCustomerTicketRepository', () => {
  let connection: DbConnection
  let repository: DrizzleCustomerTicketRepository
  const owner = {
    accountId: '22222222-2222-4222-8222-222222222222',
    email: 'maria@example.com',
  }

  beforeAll(() => {
    if (!databaseUrl) return
    connection = createDbConnection(databaseUrl)
    repository = new DrizzleCustomerTicketRepository(connection.db)
  })

  beforeEach(async () => {
    await connection.sql`truncate table helpdesk.ticket_messages, helpdesk.tickets cascade`
  })

  afterAll(async () => {
    await connection.close()
  })

  it('persiste um ticket de portal sem thread Gmail e aplica ownership no SQL', async () => {
    const ticket = makeTicket({
      gmailThreadId: null,
      source: 'portal',
      status: 'waiting',
      requesterAccountId: owner.accountId,
      requesterEmail: owner.email,
    })
    const initial = makeMessage(ticket.id, {
      kind: 'portal',
      visibility: 'customer',
      gmailMessageId: null,
      rfc822MessageId: null,
      deliveryState: null,
      direction: 'inbound',
      sentVia: 'customer',
    })
    await repository.createWithInitialMessage({ ticket, message: initial })

    const ownPage = await repository.listOwned({ ...owner, limit: 20, cursor: null })
    expect(ownPage.items.map((item) => item.id)).toEqual([ticket.id])
    const otherPage = await repository.listOwned({
      accountId: '33333333-3333-4333-8333-333333333333',
      email: 'outra@example.com',
      limit: 20,
      cursor: null,
    })
    expect(otherPage.total).toBe(0)

    const reply = makeMessage(ticket.id, {
      kind: 'portal',
      visibility: 'customer',
      gmailMessageId: null,
      rfc822MessageId: null,
      deliveryState: null,
      direction: 'inbound',
      sentVia: 'customer',
      bodyText: 'Ainda preciso de ajuda.',
    })
    const appended = await repository.appendCustomerMessage({
      ticketId: ticket.id,
      owner,
      message: reply,
      at: new Date(ticket.createdAt.getTime() + 1_000),
      aiEnabled: false,
    })
    expect(appended?.ticket.status).toBe('open')
    expect(appended?.ticket.messageCount).toBe(2)
    expect(appended?.message.kind).toBe('portal')
  })
})
