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

/** Ticket triado na chegada (alerta do Google), como a ingestão o cria. */
function makeTriagedTicket(overrides: Parameters<typeof makeTicket>[0] = {}) {
  const at = new Date('2026-07-08T12:00:00Z')
  return makeTicket({
    subject: 'Alerta de segurança',
    status: 'closed',
    resolvedAt: at,
    requesterName: 'Google',
    requesterEmail: 'no-reply@accounts.google.com',
    lastInboundAt: null,
    aiGeneration: 0,
    aiStatus: 'skipped',
    triage: 'system',
    triageRule: 'system:sender-local-part',
    triagedAt: at,
    ...overrides,
  })
}

describe('fila e triagem', () => {
  it('a lista padrão esconde os triados; triage=automated mostra só eles; o total acompanha', async () => {
    const { app, repos } = buildTestApp()
    const human = makeTicket({ subject: 'Acesso ao curso' })
    const alert = makeTriagedTicket()
    const newsletter = makeTriagedTicket({
      subject: 'Ofertas da semana',
      triage: 'bulk',
      triageRule: 'bulk:list-header',
    })
    await Promise.all([human, alert, newsletter].map((ticket) => repos.tickets.create(ticket)))

    const queue = await json(await request(app, 'GET', '/helpdesk/tickets'))
    expect(queue.items.map((t: { id: string }) => t.id)).toEqual([human.id])
    expect(queue.total).toBe(1)
    expect(queue.items[0]).toMatchObject({ triage: 'human', triageRule: null, triagedAt: null })

    const explicit = await json(await request(app, 'GET', '/helpdesk/tickets?triage=human'))
    expect(explicit.items.map((t: { id: string }) => t.id)).toEqual([human.id])

    const automated = await json(await request(app, 'GET', '/helpdesk/tickets?triage=automated'))
    expect(automated.items.map((t: { id: string }) => t.id).sort()).toEqual(
      [alert.id, newsletter.id].sort(),
    )
    expect(automated.total).toBe(2)
    expect(automated.items.find((t: { id: string }) => t.id === alert.id)).toMatchObject({
      triage: 'system',
      triageRule: 'system:sender-local-part',
      status: 'closed',
      sla: null,
    })

    // Filtro fora do contrato → 400, não fila inteira.
    expect((await request(app, 'GET', '/helpdesk/tickets?triage=tudo')).status).toBe(400)
  })

  it('o detalhe expõe a triagem do ticket e de cada mensagem', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTriagedTicket()
    await repos.tickets.create(ticket)
    await repos.messages.create(
      makeMessage(ticket.id, {
        fromEmail: 'no-reply@accounts.google.com',
        triage: 'system',
        triageRule: 'system:sender-local-part',
        isAutoreply: true,
      }),
    )
    const body = await json(await request(app, 'GET', `/helpdesk/tickets/${ticket.id}`))
    expect(body.ticket).toMatchObject({ triage: 'system', triageRule: 'system:sender-local-part' })
    expect(body.messages[0]).toMatchObject({
      triage: 'system',
      triageRule: 'system:sender-local-part',
    })
  })

  it('PATCH triage=human ("É atendimento") reabre como novo, com SLA do último inbound humano e IA re-armada', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTriagedTicket({ aiGeneration: 2 })
    await repos.tickets.create(ticket)
    // Thread aberta por NÓS (interno) + um inbound humano depois: o SLA parte do
    // inbound humano, nunca de first_message_at (que é a NOSSA mensagem).
    const ours = new Date('2026-07-08T12:00:00Z')
    const humanAt = new Date('2026-07-08T15:00:00Z')
    await repos.messages.create(
      makeMessage(ticket.id, {
        direction: 'outbound',
        sentVia: 'gmail',
        fromEmail: 'contato@sistemazero.com.br',
        gmailInternalDate: ours,
        createdAt: ours,
      }),
    )
    await repos.messages.create(
      makeMessage(ticket.id, {
        direction: 'inbound',
        fromEmail: 'maria@example.com',
        gmailInternalDate: humanAt,
        createdAt: humanAt,
      }),
    )
    await repos.messages.create(
      makeMessage(ticket.id, {
        direction: 'inbound',
        fromEmail: 'mailer-daemon@googlemail.com',
        triage: 'bounce',
        triageRule: 'bounce:return-path-empty',
        gmailInternalDate: new Date('2026-07-08T16:00:00Z'),
        createdAt: new Date('2026-07-08T16:00:00Z'),
      }),
    )

    const res = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { triage: 'human', version: 0 },
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body).toMatchObject({
      triage: 'human',
      triageRule: 'manual:promoted',
      triagedAt: null,
      status: 'new',
      version: 1,
      lastInboundAt: humanAt.toISOString(),
      aiGeneration: 3,
      aiStatus: 'skipped', // a app de teste não tem IA configurada
    })
    expect(body.sla).not.toBeNull()
    expect(body.sla.deadlineAt).toBe(new Date(humanAt.getTime() + 12 * 60 * 60_000).toISOString())

    // Agora aparece na fila padrão.
    const queue = await json(await request(app, 'GET', '/helpdesk/tickets'))
    expect(queue.items.map((t: { id: string }) => t.id)).toEqual([ticket.id])
  })

  it('PATCH triage=system ("Não é atendimento") encerra, sai da fila e vira decisão manual', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket({ status: 'open', aiStatus: 'pending', aiNextAttemptAt: new Date() })
    await repos.tickets.create(ticket)

    const res = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { triage: 'system', version: 0 },
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body).toMatchObject({
      triage: 'system',
      triageRule: 'manual:demoted',
      status: 'closed',
      aiStatus: 'skipped',
      sla: null,
      version: 1,
    })
    expect(body.triagedAt).toBeString()
    expect(body.resolvedAt ?? null).toBeNull() // resolvedAt não faz parte da view
    const stored = await repos.tickets.byId(ticket.id)
    expect(stored?.resolvedAt).not.toBeNull()

    expect((await json(await request(app, 'GET', '/helpdesk/tickets'))).items).toEqual([])
    const automated = await json(await request(app, 'GET', '/helpdesk/tickets?triage=automated'))
    expect(automated.items.map((t: { id: string }) => t.id)).toEqual([ticket.id])

    // Só as duas decisões entram de fora.
    const forbidden = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { triage: 'bounce', version: 1 },
    })
    expect(forbidden.status).toBe(400)
  })

  it('PATCH não reabre um ticket automatizado por status explícito no mesmo corpo', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTicket({ status: 'open', aiGeneration: 7 })
    await repos.tickets.create(ticket)

    const res = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { triage: 'system', status: 'open', version: 0 },
    })

    expect(res.status).toBe(200)
    expect(await json(res)).toMatchObject({
      triage: 'system',
      status: 'closed',
      aiGeneration: 8,
      aiStatus: 'skipped',
    })
  })

  it('PATCH de triagem respeita o CAS de version (409)', async () => {
    const { app, repos } = buildTestApp()
    const ticket = makeTriagedTicket({ version: 3 })
    await repos.tickets.create(ticket)
    const res = await request(app, 'PATCH', `/helpdesk/tickets/${ticket.id}`, {
      body: { triage: 'human', version: 2 },
    })
    expect(res.status).toBe(409)
    expect((await repos.tickets.byId(ticket.id))?.triage).toBe('system')
  })

  it('o painel não conta triados (nem como resolvidos, nem no volume, nem no SLA)', async () => {
    const { app, repos } = buildTestApp()
    const now = new Date()
    await repos.tickets.create(
      makeTicket({
        status: 'new',
        createdAt: now,
        updatedAt: now,
        firstMessageAt: now,
        lastInboundAt: now,
        lastMessageAt: now,
      }),
    )
    await repos.tickets.create(
      makeTriagedTicket({
        createdAt: now,
        updatedAt: now,
        firstMessageAt: now,
        lastMessageAt: now,
        resolvedAt: now,
      }),
    )
    // Rebaixado à mão hoje: também não é "resolvido".
    await repos.tickets.create(
      makeTicket({
        status: 'closed',
        resolvedAt: now,
        triage: 'system',
        triageRule: 'manual:demoted',
        triagedAt: now,
        createdAt: now,
        updatedAt: now,
        firstMessageAt: now,
        lastMessageAt: now,
      }),
    )
    const stats = await json(await request(app, 'GET', '/helpdesk/tickets/stats'))
    expect(stats.counts).toEqual({ new: 1, open: 0, waiting: 0 })
    expect(stats.resolvedToday).toBe(0)
    expect(stats.resolved7d).toBe(0)
    expect(stats.sla.unassigned).toBe(1)
    expect(stats.volume[stats.volume.length - 1].created).toBe(1)
  })
})

describe('configurações da triagem', () => {
  it('GET expõe as regras com o domínio interno padrão', async () => {
    const { app } = buildTestApp()
    const body = await json(await request(app, 'GET', '/helpdesk/settings'))
    expect(body.triageRules).toEqual({
      ignoredSenders: [],
      internalDomains: ['sistemazero.com.br'],
    })
  })

  it('PATCH normaliza (minúsculas, sem duplicata) e grava; a assinatura fica intacta', async () => {
    const { app, repos } = buildTestApp()
    await request(app, 'PATCH', '/helpdesk/settings', { body: { signature: 'Equipe' } })
    const res = await request(app, 'PATCH', '/helpdesk/settings', {
      body: {
        triageRules: {
          ignoredSenders: [
            'Avisos@Evolution.Example',
            'avisos@evolution.example',
            ' @Promo.Example ',
          ],
          internalDomains: ['Sistemazero.com.br', 'kids.sistemazero.com.br'],
        },
      },
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.signature).toBe('Equipe')
    expect(body.triageRules).toEqual({
      ignoredSenders: ['avisos@evolution.example', '@promo.example'],
      internalDomains: ['sistemazero.com.br', 'kids.sistemazero.com.br'],
    })
    expect(repos.settings.value.triageRules).toEqual(body.triageRules)
  })

  it('PATCH recusa regra inválida (400 TRIAGE_RULES_INVALID) e domínio interno vazio', async () => {
    const { app, repos } = buildTestApp()
    const invalid = await request(app, 'PATCH', '/helpdesk/settings', {
      body: { triageRules: { ignoredSenders: ['isso não é e-mail'], internalDomains: ['x.com'] } },
    })
    expect(invalid.status).toBe(400)
    expect((await json(invalid)).error.code).toBe('TRIAGE_RULES_INVALID')

    const empty = await request(app, 'PATCH', '/helpdesk/settings', {
      body: { triageRules: { ignoredSenders: [], internalDomains: [] } },
    })
    expect(empty.status).toBe(400)
    // Nada foi gravado.
    expect(repos.settings.value.triageRules.internalDomains).toEqual(['sistemazero.com.br'])

    const shape = await request(app, 'PATCH', '/helpdesk/settings', {
      body: { triageRules: { ignoredSenders: 'a@b.com' } },
    })
    expect(shape.status).toBe(400)
  })
})

describe('resposta depois de ruído na thread', () => {
  it('a resposta da equipe vai para o último inbound HUMANO, não para o mailer-daemon', async () => {
    const t = buildTestApp({ gmailEnabled: true })
    seedConnection(t)
    const ticket = makeTicket({ subject: 'Ajuda com acesso', status: 'open', messageCount: 3 })
    await t.repos.tickets.create(ticket)
    const base = new Date('2026-07-08T12:00:00Z')
    await t.repos.messages.create(
      makeMessage(ticket.id, {
        rfc822MessageId: '<inbound-1@mail.example.com>',
        fromEmail: 'maria@example.com',
        fromName: 'Maria Silva',
        createdAt: base,
      }),
    )
    await t.repos.messages.create(
      makeMessage(ticket.id, {
        direction: 'outbound',
        sentVia: 'human',
        fromEmail: 'contato@sistemazero.com.br',
        createdAt: new Date(base.getTime() + 60_000),
      }),
    )
    await t.repos.messages.create(
      makeMessage(ticket.id, {
        rfc822MessageId: '<bounce-1@googlemail.com>',
        fromEmail: 'mailer-daemon@googlemail.com',
        fromName: 'Mail Delivery Subsystem',
        triage: 'bounce',
        triageRule: 'bounce:return-path-empty',
        createdAt: new Date(base.getTime() + 120_000),
      }),
    )

    const res = await request(t.app, 'POST', `/helpdesk/tickets/${ticket.id}/reply`, {
      body: { body: 'Maria, seu acesso está liberado.', version: 0 },
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.message.toEmails).toEqual(['maria@example.com'])
    const raw = Buffer.from(t.gmailClient.sent[0]?.raw ?? '', 'base64url').toString('utf8')
    expect(raw).toMatch(/^To: .*maria@example\.com/m)
    expect(raw).toMatch(/^In-Reply-To: <inbound-1@mail\.example\.com>/m)
    expect(raw).not.toContain('mailer-daemon')
  })
})
