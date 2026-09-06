import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { IngestService } from '../../src/application/tickets/ingest.service'
import { makeParsedEmail } from '../fakes/gmail'
import {
  InMemoryMessageRepository,
  InMemoryTicketIngestionRepository,
  InMemoryTicketRepository,
} from '../fakes/in-memory'
import { makeMessage, makeTicket } from '../helpers'

const MAILBOX = 'contato@sistemazero.com.br'

function build(aiEnabled = false) {
  const tickets = new InMemoryTicketRepository()
  const messages = new InMemoryMessageRepository()
  const ingestion = new InMemoryTicketIngestionRepository(tickets, messages)
  const ingest = new IngestService(
    ingestion,
    { aiEnabled },
    () => new Date('2026-07-08T12:00:00Z'),
    () => randomUUID(),
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

  it('preserva a projeção pelo tempo do evento quando o backfill chega em ordem inversa', async () => {
    const { tickets, ingest } = build(true)
    const thread = 'thread-backfill-reverso'
    const outboundAt = new Date('2026-07-08T11:00:00Z')
    const inboundAt = new Date('2026-07-08T10:00:00Z')

    await ingest.ingest(
      makeParsedEmail({
        gmailMessageId: 'gm-outbound-newer',
        gmailThreadId: thread,
        fromEmail: MAILBOX,
        toEmails: ['maria@example.com'],
        internalDate: outboundAt,
      }),
      MAILBOX,
    )
    await ingest.ingest(
      makeParsedEmail({
        gmailMessageId: 'gm-inbound-older',
        gmailThreadId: thread,
        fromEmail: 'maria@example.com',
        internalDate: inboundAt,
      }),
      MAILBOX,
    )

    const ticket = [...tickets.rows.values()][0]
    expect(ticket).toMatchObject({
      status: 'waiting',
      messageCount: 2,
      aiStatus: 'idle',
    })
    expect(ticket?.firstMessageAt).toEqual(inboundAt)
    expect(ticket?.lastMessageAt).toEqual(outboundAt)
    expect(ticket?.lastInboundAt).toEqual(inboundAt)
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

  it('resposta do cliente tira o ticket de waiting e o devolve para a equipe', async () => {
    const { tickets, ingest } = build()
    await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-1' }), MAILBOX)
    const ticket = [...tickets.rows.values()][0]
    if (ticket) {
      ticket.status = 'waiting'
      await tickets.update(ticket, ticket.version)
    }

    await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-2' }), MAILBOX)

    expect([...tickets.rows.values()][0]?.status).toBe('open')
  })

  describe('triagem na chegada', () => {
    const at = (iso: string) => new Date(iso)

    it('automático em thread nova nasce closed, triado, sem SLA e sem IA (e o mesmo e-mail humano nasce new)', async () => {
      const { tickets, messages, ingest } = build(true)
      const alertAt = at('2026-07-08T09:00:00Z')
      const alert = makeParsedEmail({
        gmailThreadId: 'thread-google-alert',
        fromEmail: 'no-reply@accounts.google.com',
        fromName: 'Google',
        subject: 'Alerta de segurança',
        internalDate: alertAt,
      })
      const result = await ingest.ingest(alert, MAILBOX)
      expect(result).toMatchObject({
        status: 'created',
        direction: 'inbound',
        triage: 'system',
        triageRule: 'system:sender-local-part',
      })
      const ticket = [...tickets.rows.values()][0]
      expect(ticket).toMatchObject({
        status: 'closed',
        triage: 'system',
        triageRule: 'system:sender-local-part',
        aiStatus: 'skipped',
        aiNextAttemptAt: null,
        lastInboundAt: null,
        messageCount: 1,
      })
      expect(ticket?.resolvedAt).toEqual(alertAt)
      expect(ticket?.triagedAt).toEqual(alertAt)
      expect(messages.rows[0]).toMatchObject({
        triage: 'system',
        triageRule: 'system:sender-local-part',
        isAutoreply: true,
      })

      // ⭐ Anti-vácuo: o MESMO e-mail vindo de gente é a fila normal.
      const human = build(true)
      await human.ingest.ingest(
        makeParsedEmail({ gmailThreadId: 'thread-humano', fromEmail: 'maria@example.com' }),
        MAILBOX,
      )
      expect([...human.tickets.rows.values()][0]).toMatchObject({
        status: 'new',
        triage: 'human',
        triageRule: null,
        aiStatus: 'pending',
      })
      expect([...human.tickets.rows.values()][0]?.lastInboundAt).not.toBeNull()
    })

    it('e-mail interno enviado por nós nasce closed/internal; para o cliente nasce waiting como hoje', async () => {
      const { tickets, ingest } = build()
      await ingest.ingest(
        makeParsedEmail({
          gmailThreadId: 'thread-interno',
          fromEmail: MAILBOX,
          toEmails: ['helena@sistemazero.com.br'],
        }),
        MAILBOX,
      )
      await ingest.ingest(
        makeParsedEmail({
          gmailMessageId: 'gm-cliente',
          gmailThreadId: 'thread-cliente',
          rfc822MessageId: '<msg-cliente@sistemazero.com.br>',
          fromEmail: MAILBOX,
          toEmails: ['cliente@example.com'],
        }),
        MAILBOX,
      )
      const byThread = new Map(
        [...tickets.rows.values()].map((ticket) => [ticket.gmailThreadId, ticket]),
      )
      expect(byThread.get('thread-interno')).toMatchObject({
        status: 'closed',
        triage: 'internal',
        triageRule: 'internal:all-recipients-internal',
        requesterEmail: 'helena@sistemazero.com.br',
      })
      expect(byThread.get('thread-cliente')).toMatchObject({ status: 'waiting', triage: 'human' })
    })

    it('auto-reply em ticket waiting NÃO reabre, não arma SLA nem IA; só conta e avança a última mensagem', async () => {
      const { tickets, ingest } = build(true)
      await ingest.ingest(
        makeParsedEmail({ gmailMessageId: 'gm-1', internalDate: at('2026-07-08T10:00:00Z') }),
        MAILBOX,
      )
      const ticket = [...tickets.rows.values()][0]!
      ticket.status = 'waiting'
      ticket.aiStatus = 'done'
      await tickets.update(ticket, ticket.version)
      const before = await tickets.byId(ticket.id)

      const vacationAt = at('2026-07-08T11:00:00Z')
      const vacation = makeParsedEmail({
        gmailMessageId: 'gm-ooo',
        internalDate: vacationAt,
        headers: { 'auto-submitted': 'auto-replied' },
      })
      expect(await ingest.ingest(vacation, MAILBOX)).toMatchObject({
        status: 'appended',
        triage: 'auto_reply',
      })
      const after = await tickets.byId(ticket.id)
      expect(after).toMatchObject({
        status: 'waiting',
        triage: 'human',
        messageCount: 2,
        aiStatus: 'done',
        aiGeneration: before?.aiGeneration,
      })
      expect(after?.lastInboundAt).toEqual(before?.lastInboundAt)
      expect(after?.lastMessageAt).toEqual(vacationAt)

      // ⭐ Anti-vácuo: a mesma mensagem SEM o cabeçalho reabre e re-arma.
      const plain = build(true)
      await plain.ingest.ingest(
        makeParsedEmail({ gmailMessageId: 'gm-1', internalDate: at('2026-07-08T10:00:00Z') }),
        MAILBOX,
      )
      const plainTicket = [...plain.tickets.rows.values()][0]!
      plainTicket.status = 'waiting'
      plainTicket.aiStatus = 'done'
      await plain.tickets.update(plainTicket, plainTicket.version)
      await plain.ingest.ingest(
        makeParsedEmail({ gmailMessageId: 'gm-2', internalDate: at('2026-07-08T11:00:00Z') }),
        MAILBOX,
      )
      expect(await plain.tickets.byId(plainTicket.id)).toMatchObject({
        status: 'open',
        aiStatus: 'pending',
        aiGeneration: 2,
      })
    })

    it('bounce em ticket waiting reabre (nossa resposta não chegou), sem IA nem SLA novo', async () => {
      const { tickets, ingest } = build(true)
      await ingest.ingest(
        makeParsedEmail({ gmailMessageId: 'gm-1', internalDate: at('2026-07-08T10:00:00Z') }),
        MAILBOX,
      )
      const ticket = [...tickets.rows.values()][0]!
      ticket.status = 'waiting'
      ticket.aiStatus = 'done'
      await tickets.update(ticket, ticket.version)
      const before = await tickets.byId(ticket.id)

      await ingest.ingest(
        makeParsedEmail({
          gmailMessageId: 'gm-bounce',
          internalDate: at('2026-07-08T11:00:00Z'),
          fromEmail: 'mailer-daemon@googlemail.com',
          headers: { 'return-path': '<>' },
        }),
        MAILBOX,
      )
      const after = await tickets.byId(ticket.id)
      expect(after).toMatchObject({ status: 'open', triage: 'human', aiStatus: 'done' })
      expect(after?.lastInboundAt).toEqual(before?.lastInboundAt)
    })

    it('bounce em ticket TRIADO (interno) não reabre', async () => {
      const { tickets, ingest } = build()
      await ingest.ingest(
        makeParsedEmail({
          gmailThreadId: 'thread-interno',
          fromEmail: MAILBOX,
          toEmails: ['helena@sistemazero.com.br'],
          internalDate: at('2026-07-08T10:00:00Z'),
        }),
        MAILBOX,
      )
      await ingest.ingest(
        makeParsedEmail({
          gmailMessageId: 'gm-bounce',
          gmailThreadId: 'thread-interno',
          fromEmail: 'mailer-daemon@googlemail.com',
          headers: { 'return-path': '<>' },
          internalDate: at('2026-07-08T11:00:00Z'),
        }),
        MAILBOX,
      )
      expect([...tickets.rows.values()][0]).toMatchObject({
        status: 'closed',
        triage: 'internal',
        messageCount: 2,
      })
    })

    it('humano em thread triada promove MESMO chegando fora de ordem (backfill do mais novo p/ o mais antigo)', async () => {
      const { tickets, ingest } = build(true)
      const thread = 'thread-ooo-primeiro'
      // O backfill entrega o auto-reply (mais novo) antes do humano (mais antigo).
      await ingest.ingest(
        makeParsedEmail({
          gmailMessageId: 'gm-ooo-newer',
          gmailThreadId: thread,
          fromEmail: 'maria@example.com',
          headers: { 'auto-submitted': 'auto-replied' },
          internalDate: at('2026-07-08T11:00:00Z'),
        }),
        MAILBOX,
      )
      expect([...tickets.rows.values()][0]).toMatchObject({
        status: 'closed',
        triage: 'auto_reply',
      })

      const humanAt = at('2026-07-08T10:00:00Z')
      await ingest.ingest(
        makeParsedEmail({
          gmailMessageId: 'gm-human-older',
          gmailThreadId: thread,
          fromEmail: 'maria@example.com',
          internalDate: humanAt,
        }),
        MAILBOX,
      )
      const ticket = [...tickets.rows.values()][0]
      expect(ticket).toMatchObject({
        status: 'new',
        triage: 'human',
        triageRule: 'promoted:inbound',
        triagedAt: null,
        resolvedAt: null,
        aiStatus: 'pending',
        aiGeneration: 1,
        messageCount: 2,
      })
      expect(ticket?.lastInboundAt).toEqual(humanAt)
      // A "última mensagem" continua sendo o auto-reply, que é o mais novo.
      expect(ticket?.lastMessageAt).toEqual(at('2026-07-08T11:00:00Z'))
    })

    it('decisão manual vence: ticket rebaixado à mão não é promovido por inbound humano', async () => {
      const { tickets, ingest } = build(true)
      await ingest.ingest(
        makeParsedEmail({ gmailMessageId: 'gm-1', internalDate: at('2026-07-08T10:00:00Z') }),
        MAILBOX,
      )
      const ticket = [...tickets.rows.values()][0]!
      ticket.triage = 'system'
      ticket.triageRule = 'manual:demoted'
      ticket.status = 'closed'
      ticket.resolvedAt = at('2026-07-08T10:30:00Z')
      ticket.aiStatus = 'skipped'
      await tickets.update(ticket, ticket.version)

      await ingest.ingest(
        makeParsedEmail({ gmailMessageId: 'gm-2', internalDate: at('2026-07-08T11:00:00Z') }),
        MAILBOX,
      )
      expect(await tickets.byId(ticket.id)).toMatchObject({
        status: 'closed',
        triage: 'system',
        triageRule: 'manual:demoted',
        aiStatus: 'skipped',
        messageCount: 2,
      })
    })

    it('regras das settings (remetente ignorado) chegam à triagem', async () => {
      const { tickets, ingest } = build()
      await ingest.ingest(makeParsedEmail({ fromEmail: 'avisos@evolution.example' }), MAILBOX, {
        ignoredSenders: ['@evolution.example'],
        internalDomains: ['sistemazero.com.br'],
      })
      expect([...tickets.rows.values()][0]).toMatchObject({
        triage: 'system',
        triageRule: 'system:ignored-sender',
      })
    })
  })

  it('dedupe: mesma gmailMessageId duas vezes → segunda é duplicate', async () => {
    const { messages, ingest } = build()
    await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-dup' }), MAILBOX)
    const result = await ingest.ingest(makeParsedEmail({ gmailMessageId: 'gm-dup' }), MAILBOX)
    expect(result.status).toBe('duplicate')
    expect(messages.rows).toHaveLength(1)
  })

  it('reconcilia o outbound pendente quando o poller o encontra antes do commit do envio', async () => {
    const { tickets, messages, ingest } = build()
    const ticket = makeTicket({ gmailThreadId: 'thread-reply-race', messageCount: 1 })
    await tickets.create(ticket)
    await messages.create(makeMessage(ticket.id, { gmailMessageId: 'gm-inbound' }))
    await messages.create(
      makeMessage(ticket.id, {
        gmailMessageId: null,
        rfc822MessageId: '<reply-pending@sistemazero.com.br>',
        direction: 'outbound',
        sentVia: 'human',
        deliveryState: 'pending',
        deliveryLastError: null,
      }),
    )

    await ingest.ingest(
      makeParsedEmail({
        gmailMessageId: 'gm-outbound-confirmed',
        gmailThreadId: ticket.gmailThreadId!,
        rfc822MessageId: '<reply-pending@sistemazero.com.br>',
        fromEmail: MAILBOX,
        toEmails: ['maria@example.com'],
      }),
      MAILBOX,
    )

    expect(messages.rows).toHaveLength(2)
    expect(messages.rows[1]?.gmailMessageId).toBe('gm-outbound-confirmed')
    expect(messages.rows[1]?.deliveryState).toBe('sent')
    expect((await tickets.byId(ticket.id))?.messageCount).toBe(2)
  })

  it('reconcilia a primeira resposta de um ticket do portal na thread e no estado de espera', async () => {
    const { tickets, messages, ingest } = build()
    const ticket = makeTicket({
      source: 'portal',
      gmailThreadId: null,
      status: 'new',
      messageCount: 1,
    })
    await tickets.create(ticket)
    await messages.create(makeMessage(ticket.id, { kind: 'portal', gmailMessageId: null }))
    await messages.create(
      makeMessage(ticket.id, {
        gmailMessageId: null,
        rfc822MessageId: '<portal-first-reply@sistemazero.com.br>',
        direction: 'outbound',
        sentVia: 'human',
        deliveryState: 'pending',
        deliveryLastError: null,
      }),
    )

    await ingest.ingest(
      makeParsedEmail({
        gmailMessageId: 'gm-portal-first-reply',
        gmailThreadId: 'gmail-thread-after-first-reply',
        rfc822MessageId: '<portal-first-reply@sistemazero.com.br>',
        fromEmail: MAILBOX,
        toEmails: ['maria@example.com'],
      }),
      MAILBOX,
    )

    expect(await tickets.byId(ticket.id)).toMatchObject({
      gmailThreadId: 'gmail-thread-after-first-reply',
      status: 'waiting',
      messageCount: 2,
    })
  })

  it('não separa o ticket do portal se uma decisão humana marcou a tentativa como falha', async () => {
    const { tickets, messages, ingest } = build()
    const ticket = makeTicket({ source: 'portal', gmailThreadId: null, messageCount: 1 })
    await tickets.create(ticket)
    await messages.create(
      makeMessage(ticket.id, {
        gmailMessageId: null,
        rfc822MessageId: '<portal-failed-reply@sistemazero.com.br>',
        direction: 'outbound',
        sentVia: 'human',
        deliveryState: 'failed',
        deliveryLastError: 'Envio não confirmado descartado pela equipe',
      }),
    )

    await ingest.ingest(
      makeParsedEmail({
        gmailMessageId: 'gm-portal-reply-after-failure',
        gmailThreadId: 'gmail-thread-after-failure',
        rfc822MessageId: '<portal-failed-reply@sistemazero.com.br>',
        fromEmail: MAILBOX,
        toEmails: ['maria@example.com'],
      }),
      MAILBOX,
    )

    expect(tickets.rows.size).toBe(1)
    expect(await tickets.byId(ticket.id)).toMatchObject({
      gmailThreadId: 'gmail-thread-after-failure',
      status: 'waiting',
      messageCount: 2,
    })
    expect(messages.rows.find((message) => message.deliveryState === 'failed')).toMatchObject({
      deliveryLastError: 'Envio não confirmado descartado pela equipe',
    })
  })
})
