import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { IngestService } from '../../src/application/tickets/ingest.service'
import { makeParsedEmail } from '../fakes/gmail'
import { InMemoryMessageRepository, InMemoryTicketRepository } from '../fakes/in-memory'

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} }
const MAILBOX = 'contato@sistemazero.com.br'

function build(aiEnabled = false) {
  const tickets = new InMemoryTicketRepository()
  const messages = new InMemoryMessageRepository()
  const ingest = new IngestService(
    tickets,
    messages,
    { aiEnabled },
    () => new Date('2026-07-08T12:00:00Z'),
    () => randomUUID(),
    silentLogger,
  )
  return { tickets, messages, ingest }
}

describe('IngestService', () => {
  it('inbound novo cria ticket + mensagem inbound', async () => {
    const { tickets, messages, ingest } = build()
    const result = await ingest.ingest(makeParsedEmail({ subject: 'Re: Ajuda' }), MAILBOX)
    expect(result.status).toBe('created')
    expect(result.direction).toBe('inbound')

    const ticket = [...tickets.rows.values()][0]
    expect(ticket?.status).toBe('new')
    expect(ticket?.subject).toBe('Ajuda') // prefixo Re: removido
    expect(ticket?.requesterEmail).toBe('maria@example.com')
    expect(ticket?.messageCount).toBe(1)
    expect(ticket?.aiStatus).toBe('skipped') // IA desligada

    expect(messages.rows).toHaveLength(1)
    expect(messages.rows[0]?.direction).toBe('inbound')
    expect(messages.rows[0]?.sentVia).toBe('customer')
  })

  it('com IA habilitada, inbound novo entra em ai_status pending', async () => {
    const { tickets, ingest } = build(true)
    await ingest.ingest(makeParsedEmail(), MAILBOX)
    const ticket = [...tickets.rows.values()][0]
    expect(ticket?.aiStatus).toBe('pending')
    expect(ticket?.aiNextAttemptAt).not.toBeNull()
  })

  it('e-mail da própria caixa vira outbound (resposta dada no Gmail)', async () => {
    const { tickets, messages, ingest } = build()
    const result = await ingest.ingest(
      makeParsedEmail({
        gmailThreadId: 'thread-x',
        fromEmail: 'CONTATO@sistemazero.com.br', // case-insensitive
        toEmails: ['cliente@example.com'],
      }),
      MAILBOX,
    )
    expect(result.direction).toBe('outbound')
    const ticket = [...tickets.rows.values()][0]
    expect(ticket?.status).toBe('waiting')
    expect(ticket?.requesterEmail).toBe('cliente@example.com')
    expect(messages.rows[0]?.direction).toBe('outbound')
    expect(messages.rows[0]?.sentVia).toBe('gmail')
  })

  it('append: segunda mensagem no mesmo thread agrupa e incrementa', async () => {
    const { tickets, ingest } = build()
    await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-1' }), MAILBOX)
    const result = await ingest.ingest(
      makeParsedEmail({ gmailMessageId: 'gm-2', bodyText: 'ainda preciso de ajuda' }),
      MAILBOX,
    )
    expect(result.status).toBe('appended')
    expect(tickets.rows.size).toBe(1)
    const ticket = [...tickets.rows.values()][0]
    expect(ticket?.messageCount).toBe(2)
  })

  it('novo inbound reabre ticket resolvido', async () => {
    const { tickets, ingest } = build()
    await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-1' }), MAILBOX)
    const ticket = [...tickets.rows.values()][0]
    if (ticket) {
      ticket.status = 'resolved'
      await tickets.update(ticket, ticket.version)
    }
    await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-2' }), MAILBOX)
    expect([...tickets.rows.values()][0]?.status).toBe('open')
  })

  it('dedupe: mesma gmailMessageId duas vezes → segunda é duplicate', async () => {
    const { messages, ingest } = build()
    await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-dup' }), MAILBOX)
    const result = await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-dup' }), MAILBOX)
    expect(result.status).toBe('duplicate')
    expect(messages.rows).toHaveLength(1)
  })
})
