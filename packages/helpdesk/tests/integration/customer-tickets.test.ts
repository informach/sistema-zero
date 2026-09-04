import { describe, expect, it } from 'bun:test'
import {
  buildTestApp,
  CUSTOMER_USER_ID,
  customerHeaders,
  json,
  makeMessage,
  makeTicket,
  request,
} from '../helpers'

describe('portal do responsável', () => {
  it('cria um ticket de portal associado à conta autenticada', async () => {
    const { app } = buildTestApp()

    const res = await request(app, 'POST', '/helpdesk/portal/tickets', {
      headers: customerHeaders(),
      body: {
        subject: 'Preciso de ajuda com a minha assinatura',
        body: 'Não estou encontrando a opção de pagamento.',
        category: 'pagamento_reembolso',
      },
    })

    expect(res.status).toBe(201)
    const body = await json(res)
    expect(body.ticket).toMatchObject({
      source: 'portal',
      status: 'new',
      requesterEmail: 'maria@example.com',
      category: 'pagamento_reembolso',
    })
    expect(body.message).toMatchObject({
      kind: 'portal',
      visibility: 'customer',
      direction: 'inbound',
      sentVia: 'customer',
    })
  })

  it('lista e detalha somente tickets pertencentes à conta ou ao e-mail legado verificado', async () => {
    const { app, repos } = buildTestApp()
    const owned = makeTicket({
      requesterAccountId: CUSTOMER_USER_ID,
      requesterEmail: 'maria@example.com',
      source: 'portal',
    })
    const legacy = makeTicket({ requesterEmail: 'maria@example.com' })
    const other = makeTicket({ requesterEmail: 'outra@example.com', requesterAccountId: null })
    await repos.tickets.create(owned)
    await repos.tickets.create(legacy)
    await repos.tickets.create(other)
    await repos.messages.create(makeMessage(owned.id, { kind: 'portal', gmailMessageId: null }))
    await repos.messages.create(
      makeMessage(owned.id, {
        kind: 'note',
        visibility: 'internal',
        gmailMessageId: null,
        direction: null,
        sentVia: null,
      }),
    )

    const list = await request(app, 'GET', '/helpdesk/portal/tickets', {
      headers: customerHeaders(),
    })
    expect(list.status).toBe(200)
    expect((await json(list)).items.map((ticket: { id: string }) => ticket.id).sort()).toEqual(
      [owned.id, legacy.id].sort(),
    )

    const detail = await request(app, 'GET', `/helpdesk/portal/tickets/${owned.id}`, {
      headers: customerHeaders(),
    })
    expect(detail.status).toBe(200)
    expect((await json(detail)).messages).toHaveLength(1)

    const forbidden = await request(app, 'GET', `/helpdesk/portal/tickets/${other.id}`, {
      headers: customerHeaders(),
    })
    expect(forbidden.status).toBe(404)
  })

  it('reabre um ticket waiting quando o responsável envia nova mensagem', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket({
      requesterAccountId: CUSTOMER_USER_ID,
      requesterEmail: 'maria@example.com',
      source: 'portal',
      status: 'waiting',
    })
    await repos.tickets.create(ticket)

    const res = await request(app, 'POST', `/helpdesk/portal/tickets/${ticket.id}/messages`, {
      headers: customerHeaders(),
      body: { body: 'Ainda preciso de ajuda, por favor.' },
    })

    expect(res.status).toBe(200)
    expect((await json(res)).ticket.status).toBe('open')
    expect((await repos.messages.byTicketId(ticket.id)).at(-1)).toMatchObject({
      kind: 'portal',
      visibility: 'customer',
      bodyText: 'Ainda preciso de ajuda, por favor.',
    })
  })

  it('pagina chamados próprios por cursor estável e rejeita cursor inválido', async () => {
    const { app, repos } = buildTestApp()
    const oldest = makeTicket({
      requesterAccountId: CUSTOMER_USER_ID,
      requesterEmail: 'maria@example.com',
      lastMessageAt: new Date('2026-07-08T10:00:00.000Z'),
    })
    const newest = makeTicket({
      requesterAccountId: CUSTOMER_USER_ID,
      requesterEmail: 'maria@example.com',
      lastMessageAt: new Date('2026-07-08T12:00:00.000Z'),
    })
    await repos.tickets.create(oldest)
    await repos.tickets.create(newest)

    const first = await request(app, 'GET', '/helpdesk/portal/tickets?limit=1', {
      headers: customerHeaders(),
    })
    expect(first.status).toBe(200)
    const firstBody = await json(first)
    expect(firstBody.items.map((ticket: { id: string }) => ticket.id)).toEqual([newest.id])
    expect(firstBody.nextCursor).toEqual(expect.any(String))
    expect(firstBody.hasMore).toBe(true)

    const second = await request(
      app,
      'GET',
      `/helpdesk/portal/tickets?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`,
      { headers: customerHeaders() },
    )
    expect(second.status).toBe(200)
    expect((await json(second)).items.map((ticket: { id: string }) => ticket.id)).toEqual([
      oldest.id,
    ])

    const invalid = await request(app, 'GET', '/helpdesk/portal/tickets?cursor=nao-e-um-cursor', {
      headers: customerHeaders(),
    })
    expect(invalid.status).toBe(400)
    expect((await json(invalid)).error.code).toBe('CUSTOMER_TICKET_CURSOR_INVALID')
  })

  it('bloqueia sessão de perfil infantil mesmo quando os headers foram injetados', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/portal/tickets', {
      headers: customerHeaders({ 'x-auth-account-id': CUSTOMER_USER_ID }),
    })
    expect(res.status).toBe(403)
    expect((await json(res)).error.code).toBe('FORBIDDEN')
  })
})
