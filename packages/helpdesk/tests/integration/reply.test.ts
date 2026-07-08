import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { GmailConnection } from '../../src/domain/connection/gmail-connection'
import {
  buildTestApp,
  json,
  makeMessage,
  makeTicket,
  request,
  STAFF_USER_ID,
  type TestApp,
} from '../helpers'

function seedConnection(t: TestApp): void {
  const at = new Date('2026-07-08T12:00:00Z')
  const conn: GmailConnection = {
    id: randomUUID(),
    version: 0,
    emailAddress: 'contato@sistemazero.com.br',
    externalId: 'sub-1',
    accessTokenEnc: t.secretBox.seal('access-1'),
    refreshTokenEnc: t.secretBox.seal('refresh-1'),
    tokenExpiresAt: new Date(at.getTime() + 3600_000),
    scopes: [],
    status: 'connected',
    lastHistoryId: '100',
    lastSyncAt: at,
    syncNextAt: at,
    syncAttempts: 0,
    lastSyncError: null,
    connectedBy: STAFF_USER_ID,
    connectedByName: null,
    metadata: {},
    createdAt: at,
    updatedAt: at,
  }
  t.repos.connections.rows.set(conn.id, conn)
}

/** Ticket com 1 inbound (thread real p/ In-Reply-To). Devolve o id. */
async function seedTicketWithInbound(t: TestApp): Promise<string> {
  const ticket = makeTicket({ subject: 'Ajuda com acesso', status: 'new', messageCount: 1 })
  await t.repos.tickets.create(ticket)
  await t.repos.messages.create(
    makeMessage(ticket.id, {
      gmailMessageId: 'gm-inbound-1',
      rfc822MessageId: '<inbound-1@mail.example.com>',
      fromEmail: 'maria@example.com',
      fromName: 'Maria Silva',
    }),
  )
  return ticket.id
}

describe('responder ticket', () => {
  it('envia pela Gmail, persiste outbound e marca waiting', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'Oi Maria, seu acesso já está liberado.', version: 0 },
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.ticket.status).toBe('waiting')
    expect(body.message.direction).toBe('outbound')
    expect(body.message.sentVia).toBe('human')
    expect(body.message.fromEmail).toBe('contato@sistemazero.com.br')

    // Um e-mail saiu pela Gmail, na MESMA thread.
    expect(t.gmailClient.sent).toHaveLength(1)
    expect(t.gmailClient.sent[0]?.threadId).toBe(
      [...t.repos.tickets.rows.values()][0]?.gmailThreadId,
    )
    // Foi persistido com o id retornado pelo send (o poller vai deduplicar).
    const msgs = await t.repos.messages.byTicketId(id)
    expect(msgs.some((m) => m.gmailMessageId === 'sent-1')).toBe(true)
  })

  it('anexa a assinatura das configurações', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)
    await request(t.app, 'PATCH', '/helpdesk/settings', {
      body: { signature: 'Equipe Sistema Zero' },
    })

    await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'Pronto.', version: 0 },
    })
    const msgs = await t.repos.messages.byTicketId(id)
    const outbound = msgs.find((m) => m.direction === 'outbound')
    expect(outbound?.bodyText).toBe('Pronto.\n\nEquipe Sistema Zero')
  })

  it('duplo-clique (mesma version) → 409 e UM e-mail só', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)

    const first = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'resposta', version: 0 },
    })
    expect(first.status).toBe(200)
    const second = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'resposta de novo', version: 0 },
    })
    expect(second.status).toBe(409)
    expect((await json(second)).error.code).toBe('CONCURRENCY_CONFLICT')
    expect(t.gmailClient.sent).toHaveLength(1)
  })

  it('sem caixa conectada → 409 CONNECTION_NOT_CONNECTED (não envia)', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    const id = await seedTicketWithInbound(t)
    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'oi', version: 0 },
    })
    expect(res.status).toBe(409)
    expect((await json(res)).error.code).toBe('CONNECTION_NOT_CONNECTED')
    expect(t.gmailClient.sent).toHaveLength(0)
  })

  it('falha no envio do Gmail → 502 GMAIL_SEND_FAILED', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)
    const { GmailApiError } = await import('../../src/domain/ports/gmail-client.port')
    t.gmailClient.sendError = new GmailApiError('boom', 500, false)

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'oi', version: 0 },
    })
    expect(res.status).toBe(502)
    expect((await json(res)).error.code).toBe('GMAIL_SEND_FAILED')
    // Nada persistido como outbound (só o inbound seed).
    const msgs = await t.repos.messages.byTicketId(id)
    expect(msgs.filter((m) => m.direction === 'outbound')).toHaveLength(0)
  })
})

describe('nota interna', () => {
  it('POST notes adiciona nota sem enviar e-mail', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/notes`, {
      body: { body: 'Cliente é aluno antigo, priorizar.' },
    })
    expect(res.status).toBe(201)
    const body = await json(res)
    expect(body.message.kind).toBe('note')
    expect(body.message.createdByName).toBe('Helena')
    expect(t.gmailClient.sent).toHaveLength(0)

    const msgs = await t.repos.messages.byTicketId(id)
    expect(msgs.some((m) => m.kind === 'note')).toBe(true)
  })
})
