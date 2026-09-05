import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { GmailConnection } from '../../src/domain/connection/gmail-connection'
import { OAuthProviderError } from '../../src/domain/ports/oauth-provider.port'
import type { Ticket } from '../../src/domain/ticket/ticket'
import {
  buildTestApp,
  json,
  makeMessage,
  makeTicket,
  request,
  STAFF_USER_ID,
  TEST_PORTAL_URLS,
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
      [...t.repos.tickets.rows.values()][0]?.gmailThreadId ?? undefined,
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

  // Ticket de portal que JÁ foi respondido por e-mail antes (tem thread do Gmail):
  // o cliente pode ter continuado por e-mail, então a conversa segue lá — e a
  // resposta também aparece no portal, porque já é `visibility: 'customer'`.
  it('ticket do portal que vive numa thread do Gmail (legado) segue pelo Gmail, na MESMA thread', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const ticket = makeTicket({
      gmailThreadId: 'thread-legado-1',
      source: 'portal',
      portal: 'adult',
      requesterAccountId: '22222222-2222-4222-8222-222222222222',
    })
    await t.repos.tickets.create(ticket)
    await t.repos.messages.create(
      makeMessage(ticket.id, { kind: 'portal', gmailMessageId: null, rfc822MessageId: null }),
    )

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Olá! Vamos resolver isso juntos.', version: 0 },
    })

    expect(res.status).toBe(200)
    expect(t.gmailClient.sent).toHaveLength(1)
    expect(t.gmailClient.sent[0]?.threadId).toBe('thread-legado-1')
    expect(t.messaging.sent).toHaveLength(0)
    const outbound = (await t.repos.messages.byTicketId(ticket.id)).filter(
      (m) => m.direction === 'outbound',
    )
    expect(outbound.map((m) => m.kind)).toEqual(['email'])
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

  it('falha definitiva no Gmail libera uma nova resposta, sem marcar a entrega como ambígua', async () => {
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
    // Um 500 do Gmail é uma rejeição definitiva: não há envio para reconciliar.
    const msgs = await t.repos.messages.byTicketId(id)
    const outbound = msgs.find((message) => message.direction === 'outbound')
    expect(outbound?.deliveryState).toBe('failed')
    expect(outbound?.gmailMessageId).toBeNull()

    t.gmailClient.sendError = null
    const current = await t.repos.tickets.byId(id)
    const retry = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'oi, agora confirmado', version: current?.version },
    })
    expect(retry.status).toBe(200)
    expect(t.gmailClient.sent).toHaveLength(1)
  })

  it('falha ao renovar o token não deixa uma intenção pending bloqueando o ticket', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)
    t.provider.refreshError = new OAuthProviderError('rede indisponível', false)

    const failed = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'oi', version: 0 },
    })
    expect(failed.status).toBe(502)
    const pending = (await t.repos.messages.byTicketId(id)).find(
      (message) => message.direction === 'outbound',
    )
    expect(pending?.deliveryState).toBe('failed')

    t.provider.refreshError = null
    const current = await t.repos.tickets.byId(id)
    const retry = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'oi, agora confirmado', version: current?.version },
    })
    expect(retry.status).toBe(200)
  })

  it('permite reconciliar manualmente uma entrega desconhecida antes de decidir reenviar', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)
    const { GmailApiError } = await import('../../src/domain/ports/gmail-client.port')
    t.gmailClient.sendError = new GmailApiError('conexão interrompida', 0, false)

    const failed = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'oi', version: 0 },
    })
    expect(failed.status).toBe(502)
    const outbound = (await t.repos.messages.byTicketId(id)).find(
      (message) => message.direction === 'outbound',
    )
    expect(outbound?.deliveryState).toBe('unknown')
    if (!outbound?.rfc822MessageId) throw new Error('mensagem outbound sem Message-ID RFC 822')

    t.gmailClient.sentByRfc822MessageId.set(outbound.rfc822MessageId, {
      id: 'sent-confirmed-later',
      threadId: 'thread-confirmed-later',
    })
    const recovered = await request(
      t.app,
      'POST',
      `/helpdesk/tickets/${id}/deliveries/${outbound.id}/reconcile`,
      { body: {} },
    )
    expect(recovered.status).toBe(200)
    expect((await json(recovered)).message.deliveryState).toBe('sent')
  })

  it('permite descartar conscientemente uma entrega desconhecida para liberar uma nova resposta', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)
    const { GmailApiError } = await import('../../src/domain/ports/gmail-client.port')
    t.gmailClient.sendError = new GmailApiError('conexão interrompida', 0, false)

    await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'oi', version: 0 },
    })
    const outbound = (await t.repos.messages.byTicketId(id)).find(
      (message) => message.direction === 'outbound',
    )
    if (!outbound) throw new Error('mensagem outbound ausente')

    const discarded = await request(
      t.app,
      'POST',
      `/helpdesk/tickets/${id}/deliveries/${outbound.id}/mark-failed`,
      { body: { confirmation: 'delivery-not-confirmed' } },
    )
    expect(discarded.status).toBe(200)
    expect((await json(discarded)).message.deliveryState).toBe('failed')

    t.gmailClient.sendError = null
    const current = await t.repos.tickets.byId(id)
    const retry = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'nova resposta', version: current?.version },
    })
    expect(retry.status).toBe(200)
  })

  it('permite reconciliar uma intenção pending que ficou antiga após interrupção do processo', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)
    const stale = makeMessage(id, {
      gmailMessageId: null,
      rfc822MessageId: `<${randomUUID()}@sistemazero.com.br>`,
      direction: 'outbound',
      sentVia: 'human',
      deliveryState: 'pending',
      deliveryLastError: null,
      createdAt: new Date(Date.now() - 3 * 60_000),
    })
    t.repos.messages.rows.push(stale)
    t.gmailClient.sentByRfc822MessageId.set(stale.rfc822MessageId ?? '', {
      id: 'sent-after-restart',
      threadId: 'thread-after-restart',
    })

    const recovered = await request(
      t.app,
      'POST',
      `/helpdesk/tickets/${id}/deliveries/${stale.id}/reconcile`,
      { body: {} },
    )
    expect(recovered.status).toBe(200)
    expect((await json(recovered)).reconciled).toBe(true)
  })

  it('reconcilia um envio aceito pelo Gmail cuja resposta HTTP se perdeu', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const id = await seedTicketWithInbound(t)
    const { GmailApiError } = await import('../../src/domain/ports/gmail-client.port')
    t.gmailClient.sendAfterAcceptedError = new GmailApiError('conexão interrompida', 0, false)

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${id}/reply`, {
      body: { body: 'Sua resposta foi enviada.', version: 0 },
    })

    expect(res.status).toBe(200)
    expect(t.gmailClient.sent).toHaveLength(1)
    const messages = await t.repos.messages.byTicketId(id)
    expect(messages.filter((message) => message.direction === 'outbound')).toHaveLength(1)
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

describe('responder ticket do PORTAL (sem Gmail)', () => {
  const ACCOUNT_ID = '22222222-2222-4222-8222-222222222222'

  /** Ticket aberto pelo /ajuda: sem thread do Gmail, com 1 mensagem do cliente. */
  async function seedPortalTicket(t: TestApp, overrides: Partial<Ticket> = {}) {
    const ticket = makeTicket({
      gmailThreadId: null,
      source: 'portal',
      portal: 'kids',
      status: 'new',
      messageCount: 1,
      requesterAccountId: ACCOUNT_ID,
      requesterName: 'Maria Silva',
      requesterEmail: 'maria@example.com',
      subject: 'Ajuda com acesso',
      ...overrides,
    })
    await t.repos.tickets.create(ticket)
    await t.repos.messages.create(
      makeMessage(ticket.id, {
        kind: 'portal',
        gmailMessageId: null,
        rfc822MessageId: null,
        deliveryState: null,
      }),
    )
    return ticket
  }

  // ⭐ Anti-vácuo: `gmailEnabled` false e NENHUMA conexão semeada — se sobrar
  // qualquer resquício de requireConnection() no caminho do portal, reprova em 409.
  it('responde NO portal: mensagem na conversa, ticket aguardando, aviso pelo messaging', async () => {
    const t = buildTestApp()
    await request(t.app, 'PATCH', '/helpdesk/settings', {
      body: { signature: 'Equipe Sistema Zero' },
    })
    const ticket = await seedPortalTicket(t)

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Oi Maria, seu acesso já está liberado.', version: 0 },
    })

    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.ticket.status).toBe('waiting')
    // Um passo só (sem intenção + confirmação): version avança 1, não 2.
    expect(body.ticket.version).toBe(1)
    expect(body.ticket.messageCount).toBe(2)
    expect(body.message).toMatchObject({
      kind: 'portal',
      direction: 'outbound',
      visibility: 'customer',
      sentVia: 'human',
      deliveryState: null,
      bodyText: 'Oi Maria, seu acesso já está liberado.\n\nEquipe Sistema Zero',
      createdBy: STAFF_USER_ID,
    })

    // Nada pela Gmail — não existe nem conexão — e o ticket segue sem thread.
    expect(t.gmailClient.sent).toHaveLength(0)
    expect((await t.repos.tickets.byId(ticket.id))?.gmailThreadId).toBeNull()

    // A resposta HTTP não depende do messaging: o aviso foi persistido na
    // outbox na mesma operação e ainda não houve I/O externo.
    expect(t.messaging.sent).toHaveLength(0)
    const queued = [...t.repos.notificationOutbox.rows.values()]
    expect(queued.map((item) => item.payload)).toEqual([
      {
        templateKey: 'helpdesk-reply',
        recipient: { name: 'Maria Silva', email: 'maria@example.com' },
        variables: {
          saudacao: 'Olá, Maria!',
          assunto: 'Ajuda com acesso',
          link: `${TEST_PORTAL_URLS.kids}/responsavel/ajuda`,
        },
        idempotencyKey: `helpdesk-reply:${body.message.id}`,
      },
    ])
    expect(queued[0]?.status).toBe('pending')

    await t.notificationWorker?.tick()
    expect(t.messaging.sent).toEqual(queued.map((item) => item.payload))
    expect(t.repos.notificationOutbox.rows.get(queued[0]!.id)?.status).toBe('sent')

    // E a mensagem está na conversa que o cliente vê (visibility customer).
    const stored = await t.repos.messages.byTicketId(ticket.id)
    expect(
      stored.filter((m) => m.direction === 'outbound' && m.visibility === 'customer'),
    ).toHaveLength(1)
  })

  it('duplo-clique (mesma version) → 409 e UMA mensagem, UM job de aviso', async () => {
    const t = buildTestApp()
    const ticket = await seedPortalTicket(t)

    const first = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Primeira.', version: 0 },
    })
    const second = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Primeira.', version: 0 },
    })

    expect(first.status).toBe(200)
    expect(second.status).toBe(409)
    expect((await json(second)).error.code).toBe('CONCURRENCY_CONFLICT')
    const outbound = (await t.repos.messages.byTicketId(ticket.id)).filter(
      (m) => m.direction === 'outbound',
    )
    expect(outbound).toHaveLength(1)
    expect(t.repos.notificationOutbox.rows.size).toBe(1)
    expect(t.messaging.sent).toHaveLength(0)
    await t.notificationWorker?.tick()
    expect(t.messaging.sent).toHaveLength(1)
  })

  it('entrega Gmail pendurada (`unknown`) no ticket bloqueia a resposta no portal — uma saída em voo', async () => {
    const t = buildTestApp()
    const ticket = await seedPortalTicket(t)
    await t.repos.messages.create(
      makeMessage(ticket.id, {
        direction: 'outbound',
        sentVia: 'human',
        gmailMessageId: null,
        deliveryState: 'unknown',
      }),
    )

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Outra.', version: 0 },
    })

    expect(res.status).toBe(409)
    expect(t.messaging.sent).toHaveLength(0)
    expect(t.repos.notificationOutbox.rows.size).toBe(0)
  })

  it('aviso por e-mail falhando fica persistido e uma tentativa posterior entrega', async () => {
    const t = buildTestApp()
    t.messaging.failNext = new Error('messaging/send falhou: 502')
    const ticket = await seedPortalTicket(t)

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Resolvido por aqui.', version: 0 },
    })

    expect(res.status).toBe(200)
    expect(t.messaging.sent).toHaveLength(0)
    const outbound = (await t.repos.messages.byTicketId(ticket.id)).filter(
      (m) => m.direction === 'outbound',
    )
    expect(outbound).toHaveLength(1)
    expect((await t.repos.tickets.byId(ticket.id))?.status).toBe('waiting')

    await t.notificationWorker?.tick()
    const [job] = [...t.repos.notificationOutbox.rows.values()]
    expect(job).toMatchObject({ status: 'pending', attempts: 1 })
    if (!job) throw new Error('job do aviso não foi persistido')
    job.nextAttemptAt = new Date(0)
    await t.notificationWorker?.tick()
    expect(t.messaging.sent).toHaveLength(1)
    expect(t.repos.notificationOutbox.rows.get(job.id)?.status).toBe('sent')
  })

  it('sem worker configurado em dev, responde e mantém o aviso pendente para processamento futuro', async () => {
    const t = buildTestApp({ messagingEnabled: false })
    const ticket = await seedPortalTicket(t)

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Resolvido.', version: 0 },
    })

    expect(res.status).toBe(200)
    expect(t.messaging.sent).toHaveLength(0)
    expect([...t.repos.notificationOutbox.rows.values()][0]?.status).toBe('pending')
  })

  it('ticket sem `portal` (legado) e sem nome: link do adulto e destinatário com fallback', async () => {
    const t = buildTestApp()
    const ticket = await seedPortalTicket(t, { portal: null, requesterName: null })

    await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Olá!', version: 0 },
    })

    const payload = [...t.repos.notificationOutbox.rows.values()][0]?.payload
    expect(payload?.variables.link).toBe(`${TEST_PORTAL_URLS.adult}/ajuda`)
    expect(payload?.recipient.name).toBe('Cliente')
    expect(payload?.variables.saudacao).toBe('Olá!')
  })
})
