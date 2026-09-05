import { describe, expect, it } from 'bun:test'
import { buildTestApp, json, makeMessage, makeTicket, request } from '../helpers'

describe('tickets', () => {
  it('lista vazia no começo', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
    expect(body.hasMore).toBe(false)
    expect(body.nextCursor).toBeNull()
  })

  it('pagina com cursor sem repetir itens quando um ticket novo entra no topo', async () => {
    const { app, repos } = buildTestApp()
    const base = new Date('2026-07-08T12:00:00Z')
    const first = makeTicket({
      id: '10000000-0000-4000-8000-000000000001',
      status: 'resolved',
      firstMessageAt: base,
      lastMessageAt: new Date(base.getTime() + 3_000),
    })
    const second = makeTicket({
      id: '10000000-0000-4000-8000-000000000002',
      status: 'resolved',
      firstMessageAt: base,
      lastMessageAt: new Date(base.getTime() + 2_000),
    })
    const third = makeTicket({
      id: '10000000-0000-4000-8000-000000000003',
      status: 'resolved',
      firstMessageAt: base,
      lastMessageAt: new Date(base.getTime() + 1_000),
    })
    await Promise.all([first, second, third].map((ticket) => repos.tickets.create(ticket)))

    const page1 = await json(await request(app, 'GET', '/helpdesk/tickets?limit=2'))
    expect(page1.items.map((ticket: { id: string }) => ticket.id)).toEqual([first.id, second.id])
    expect(page1.nextCursor).toBeString()

    await repos.tickets.create(
      makeTicket({
        id: '10000000-0000-4000-8000-000000000004',
        status: 'resolved',
        firstMessageAt: base,
        lastMessageAt: new Date(base.getTime() + 4_000),
      }),
    )
    const page2 = await json(
      await request(
        app,
        'GET',
        `/helpdesk/tickets?limit=2&cursor=${encodeURIComponent(page1.nextCursor)}`,
      ),
    )
    expect(page2.items.map((ticket: { id: string }) => ticket.id)).toEqual([third.id])
    expect(page2.nextCursor).toBeNull()
  })

  it('recusa cursor interno inválido em vez de reiniciar silenciosamente a fila', async () => {
    const { app } = buildTestApp()
    const res = await request(app, 'GET', '/helpdesk/tickets?cursor=invalido')
    expect(res.status).toBe(400)
    expect((await json(res)).error.code).toBe('TICKET_CURSOR_INVALID')
  })

  it('lista com filtros de status/categoria e busca', async () => {
    const { app, repos } = buildTestApp()
    await repos.tickets.create(makeTicket({ subject: 'Acesso ao curso', status: 'open' }))
    await repos.tickets.create(
      makeTicket({
        subject: 'Reembolso do pedido',
        status: 'new',
        category: 'pagamento_reembolso',
      }),
    )

    const byStatus = await request(app, 'GET', '/helpdesk/tickets?status=open')
    expect((await json(byStatus)).items).toHaveLength(1)

    const byCategory = await request(app, 'GET', '/helpdesk/tickets?category=pagamento_reembolso')
    expect((await json(byCategory)).items).toHaveLength(1)

    const byQuery = await request(app, 'GET', '/helpdesk/tickets?q=reembolso')
    const found = await json(byQuery)
    expect(found.items).toHaveLength(1)
    expect(found.items[0].subject).toBe('Reembolso do pedido')
  })

  it('filtra a fila por situação de SLA e por atribuição, preservando a prioridade operacional', async () => {
    const { app, repos } = buildTestApp()
    const now = Date.now()
    const breached = makeTicket({
      subject: 'Já passou da meta',
      firstMessageAt: new Date(now - 13 * 60 * 60_000),
      lastInboundAt: new Date(now - 13 * 60 * 60_000),
      lastMessageAt: new Date(now - 13 * 60 * 60_000),
    })
    const risk = makeTicket({
      subject: 'Perto da meta',
      firstMessageAt: new Date(now - 10 * 60 * 60_000),
      lastInboundAt: new Date(now - 10 * 60 * 60_000),
      lastMessageAt: new Date(now - 10 * 60 * 60_000),
    })
    const assigned = makeTicket({
      subject: 'Já atribuído',
      assignedTo: '33333333-3333-4333-8333-333333333333',
      assignedToName: 'Rafa',
      firstMessageAt: new Date(now - 60 * 60_000),
      lastInboundAt: new Date(now - 60 * 60_000),
      lastMessageAt: new Date(now - 60 * 60_000),
    })
    const resolvedUnassigned = makeTicket({
      subject: 'Resolvido mas sem responsável',
      status: 'resolved',
      firstMessageAt: new Date(now - 60 * 60_000),
      lastInboundAt: new Date(now - 60 * 60_000),
      lastMessageAt: new Date(now - 60 * 60_000),
    })
    await Promise.all([
      repos.tickets.create(breached),
      repos.tickets.create(risk),
      repos.tickets.create(assigned),
      repos.tickets.create(resolvedUnassigned),
    ])

    const attention = await request(app, 'GET', '/helpdesk/tickets?sla=attention')
    const attentionBody = await json(attention)
    expect(attentionBody.items.map((ticket: { id: string }) => ticket.id)).toEqual([
      breached.id,
      risk.id,
    ])
    expect(
      attentionBody.items.map((ticket: { sla: { state: string } }) => ticket.sla.state),
    ).toEqual(['breached', 'at_risk'])

    const unassigned = await request(app, 'GET', '/helpdesk/tickets?assignment=unassigned')
    const unassignedBody = await json(unassigned)
    expect(unassignedBody.items.map((ticket: { id: string }) => ticket.id)).toEqual([
      breached.id,
      risk.id,
      resolvedUnassigned.id,
    ])

    const queue = await request(app, 'GET', '/helpdesk/tickets?queue=unassigned')
    expect(queue.status).toBe(200)
    expect((await json(queue)).items.map((ticket: { id: string }) => ticket.id)).toEqual([
      breached.id,
      risk.id,
    ])
  })

  it('detalhe traz o ticket com a thread de mensagens', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket()
    await repos.tickets.create(ticket)
    await repos.messages.create(makeMessage(ticket.id))

    const res = await request(app, 'GET', `/helpdesk/tickets/${ticket.id}`)
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.ticket.id).toBe(ticket.id)
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].direction).toBe('inbound')
  })

  it('404 para ticket inexistente; 400 para id lixo', async () => {
    const { app } = buildTestApp()
    const missing = await request(
      app,
      'GET',
      '/helpdesk/tickets/99999999-9999-4999-8999-999999999999',
    )
    expect(missing.status).toBe(404)
    const garbage = await request(app, 'GET', '/helpdesk/tickets/nao-e-uuid')
    expect(garbage.status).toBe(400)
  })

  it('PATCH muda status/categoria/prioridade e atribui a mim', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket()
    await repos.tickets.create(ticket)

    const res = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: {
        status: 'open',
        category: 'curso_acesso',
        priority: 'alta',
        assignToMe: true,
        version: 0,
      },
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.status).toBe('open')
    expect(body.category).toBe('curso_acesso')
    expect(body.categoryManual).toBe(true)
    expect(body.priority).toBe('alta')
    expect(body.assignedToName).toBe('Helena')
    expect(body.version).toBe(1)
  })

  it('PATCH com version defasada → 409 CONCURRENCY_CONFLICT', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket()
    await repos.tickets.create(ticket)

    const first = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { status: 'open', version: 0 },
    })
    expect(first.status).toBe(200)

    const stale = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { status: 'resolved', version: 0 },
    })
    expect(stale.status).toBe(409)
    expect((await json(stale)).error.code).toBe('CONCURRENCY_CONFLICT')
  })

  it('grava a data de resolução uma vez e a limpa quando o ticket reabre', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket()
    await repos.tickets.create(ticket)

    const resolved = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { status: 'resolved', version: 0 },
    })
    expect(resolved.status).toBe(200)
    const resolvedAt = (await repos.tickets.byId(ticket.id))?.resolvedAt
    expect(resolvedAt).toBeInstanceOf(Date)

    const reopened = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { status: 'open', version: 1 },
    })
    expect(reopened.status).toBe(200)
    expect((await repos.tickets.byId(ticket.id))?.resolvedAt).toBeNull()
  })

  it('remover categoria manual (null) destrava a reclassificação', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket({ category: 'outro', categoryManual: true })
    await repos.tickets.create(ticket)

    const res = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { category: null, version: 0 },
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.category).toBeNull()
    expect(body.categoryManual).toBe(false)
  })
})
