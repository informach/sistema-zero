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
      subject: 'Preciso de ajuda com a minha assinatura',
      category: 'pagamento_reembolso',
    })
    expect(body.message).toMatchObject({
      kind: 'portal',
      visibility: 'customer',
      direction: 'inbound',
    })
  })

  // ⚠️ O repositorio do portal faz `select()` sem projecao e o BFF do member-shell
  // repassa o corpo verbatim: sem a projecao estreita, o rascunho da IA (resposta que
  // humano nenhum aprovou), o resumo, a classificacao (sentimento e flags) e o
  // responsavel interno chegariam ao navegador do cliente. A tela nao os desenha, mas
  // o JSON os carrega. Este caso e a tranca, nas tres rotas que devolvem ticket.
  it('nao vaza bastidor da equipe: nem IA, nem responsavel, nem entrega', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket({
      requesterAccountId: CUSTOMER_USER_ID,
      requesterEmail: 'maria@example.com',
      source: 'portal',
      aiDraft: 'Oi Maria, aqui vai o reembolso que a IA sugeriu sem ninguem revisar.',
      aiSummary: 'Cliente pede reembolso.',
      aiClassification: {
        category: 'pagamento_reembolso',
        priority: 'alta',
        confidence: 0.91,
        sentiment: 'irritado',
        flags: { reembolso: true, juridico: false },
      },
      assignedTo: 'staff-1',
      assignedToName: 'Atendente',
      priority: 'alta',
    })
    await repos.tickets.create(ticket)
    await repos.messages.create(
      makeMessage(ticket.id, {
        kind: 'portal',
        gmailMessageId: null,
        deliveryLastError: 'gmail 500 detalhe interno',
        createdBy: 'staff-1',
        createdByName: 'Atendente',
      }),
    )

    const proibidos = [
      'aiDraft',
      'aiSummary',
      'aiClassification',
      'aiStatus',
      'assignedTo',
      'assignedToName',
      'priority',
      'sla',
      'gmailThreadId',
      'requesterEmail',
      'deliveryLastError',
      'deliveryState',
      'sentVia',
      'createdBy',
      'toEmails',
    ]

    const detail = await json(
      await request(app, 'GET', `/helpdesk/portal/tickets/${ticket.id}`, {
        headers: customerHeaders(),
      }),
    )
    const list = await json(
      await request(app, 'GET', '/helpdesk/portal/tickets', { headers: customerHeaders() }),
    )
    const appended = await json(
      await request(app, 'POST', `/helpdesk/portal/tickets/${ticket.id}/messages`, {
        headers: customerHeaders(),
        body: { body: 'Continuo sem conseguir.' },
      }),
    )

    for (const payload of [detail, list, appended]) {
      const cru = JSON.stringify(payload)
      for (const campo of proibidos) expect(cru).not.toContain(campo)
      expect(cru).not.toContain('sem ninguem revisar')
      expect(cru).not.toContain('detalhe interno')
      // Anti-vacuo: payload vazio passaria em tudo acima.
      expect(cru).toContain(ticket.id)
    }
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
