import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { ClassifyResult, DraftResult } from '../../src/application/ai/prompts'
import { TicketAiService } from '../../src/application/ai/ticket-ai.service'
import { GmailAccountService } from '../../src/application/connection/gmail-account.service'
import { ReplyService } from '../../src/application/tickets/reply.service'
import type { GmailConnection } from '../../src/domain/connection/gmail-connection'
import { GmailApiError } from '../../src/domain/ports/gmail-client.port'
import { DEFAULT_SETTINGS, type HelpdeskSettings } from '../../src/domain/settings/settings'
import { AiWorker } from '../../src/infrastructure/workers/ai-worker'
import { FakeLlmClient } from '../fakes/ai'
import { FakeGmailClient, FakeGmailOAuthProvider, FakeSecretBox } from '../fakes/gmail'
import {
  InMemoryConnectionRepository,
  InMemoryMessageRepository,
  InMemorySettingsRepository,
  InMemoryTicketRepository,
} from '../fakes/in-memory'
import { makeMessage, makeTicket } from '../helpers'

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} }
const NOW = new Date('2026-07-08T12:00:00Z')

const CLS_OK: ClassifyResult = {
  category: 'curso_acesso',
  priority: 'normal',
  confidence: 0.9,
  sentiment: 'neutro',
  flags: { reembolso: false, juridico: false },
  summary: 'Cliente com dúvida de acesso.',
}
const DRAFT_COVERED: DraftResult = { reply: 'Oi, o acesso é assim…', kbCoverage: 'covered' }

function build(settingsOverride: Partial<HelpdeskSettings> = {}) {
  const tickets = new InMemoryTicketRepository()
  const messages = new InMemoryMessageRepository()
  const connections = new InMemoryConnectionRepository()
  const settings = new InMemorySettingsRepository()
  settings.value = {
    ...DEFAULT_SETTINGS,
    autoReplyEnabled: true,
    autoReplyCategories: ['curso_acesso'],
    autoReplyConfidenceMin: 0.75,
    ...settingsOverride,
  }
  const gmail = new FakeGmailClient()
  const secretBox = new FakeSecretBox()
  const now = () => NOW
  const gmailAccount = new GmailAccountService(
    connections,
    { provider: new FakeGmailOAuthProvider(), secretBox },
    now,
    silentLogger,
  )
  const llm = new FakeLlmClient()
  const reply = new ReplyService(
    tickets,
    messages,
    connections,
    settings,
    gmailAccount,
    gmail,
    { fromName: 'Sistema Zero' },
    now,
    () => randomUUID(),
    silentLogger,
  )
  const ticketAi = new TicketAiService(
    llm,
    tickets,
    messages,
    async () => [],
    {
      maxThreadChars: 24_000,
    },
    now,
  )
  const worker = new AiWorker({
    tickets,
    ticketAi,
    autoReply: { settings, sender: reply },
    now,
    logger: silentLogger,
    config: { intervalMs: 15_000, leaseMs: 120_000, maxAttempts: 3 },
  })
  return { tickets, messages, connections, settings, gmail, secretBox, llm, reply, worker }
}

function seedConnection(connections: InMemoryConnectionRepository, secretBox: FakeSecretBox) {
  const conn: GmailConnection = {
    id: randomUUID(),
    version: 0,
    emailAddress: 'contato@sistemazero.com.br',
    externalId: 'sub-1',
    accessTokenEnc: secretBox.seal('access-1'),
    refreshTokenEnc: secretBox.seal('refresh-1'),
    tokenExpiresAt: new Date(NOW.getTime() + 3600_000),
    scopes: [],
    status: 'connected',
    lastHistoryId: '1',
    lastSyncAt: NOW,
    syncNextAt: NOW,
    syncAttempts: 0,
    lastSyncError: null,
    connectedBy: randomUUID(),
    connectedByName: null,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  }
  connections.rows.set(conn.id, conn)
}

async function seedPending(tickets: InMemoryTicketRepository, messages: InMemoryMessageRepository) {
  const ticket = makeTicket({
    aiStatus: 'pending',
    aiNextAttemptAt: new Date(NOW.getTime() - 1000),
    category: null,
    autoReplyState: 'none',
  })
  await tickets.create(ticket)
  await messages.create(
    makeMessage(ticket.id, { fromEmail: 'maria@example.com', isAutoreply: false }),
  )
  return ticket.id
}

describe('auto-resposta (ai-worker → política → guard de fase)', () => {
  it('coberto pelo KB + toggle ON → envia e marca sent', async () => {
    const t = build()
    seedConnection(t.connections, t.secretBox)
    const id = await seedPending(t.tickets, t.messages)
    t.llm.queue = [CLS_OK, DRAFT_COVERED]

    await t.worker.tick()

    expect(t.gmail.sent).toHaveLength(1)
    const ticket = await t.tickets.byId(id)
    expect(ticket?.autoReplyState).toBe('sent')
    expect(ticket?.autoRepliedAt).not.toBeNull()
    const msgs = await t.messages.byTicketId(id)
    expect(msgs.some((m) => m.direction === 'outbound' && m.sentVia === 'ai')).toBe(true)
  })

  it('toggle OFF → não envia, rascunho com motivo', async () => {
    const t = build({ autoReplyEnabled: false })
    seedConnection(t.connections, t.secretBox)
    const id = await seedPending(t.tickets, t.messages)
    t.llm.queue = [CLS_OK, DRAFT_COVERED]

    await t.worker.tick()

    expect(t.gmail.sent).toHaveLength(0)
    const ticket = await t.tickets.byId(id)
    expect(ticket?.autoReplyState).toBe('none')
    expect(ticket?.autoReplyReason).toContain('desligada')
  })

  it('assunto sensível (reembolso) → rascunho com motivo, não envia', async () => {
    const t = build()
    seedConnection(t.connections, t.secretBox)
    const id = await seedPending(t.tickets, t.messages)
    t.llm.queue = [{ ...CLS_OK, flags: { reembolso: true, juridico: false } }, DRAFT_COVERED]

    await t.worker.tick()

    expect(t.gmail.sent).toHaveLength(0)
    expect((await t.tickets.byId(id))?.autoReplyReason).toContain('sensível')
  })

  it('KB não cobre → rascunho, não envia', async () => {
    const t = build()
    seedConnection(t.connections, t.secretBox)
    const id = await seedPending(t.tickets, t.messages)
    t.llm.queue = [CLS_OK, { reply: 'não sei', kbCoverage: 'not_covered' }]

    await t.worker.tick()

    expect(t.gmail.sent).toHaveLength(0)
    expect((await t.tickets.byId(id))?.autoReplyReason).toContain('base de conhecimento')
  })

  it('guard de fase: auto_reply_state já sent → autoReply não envia de novo', async () => {
    const t = build()
    seedConnection(t.connections, t.secretBox)
    const ticket = makeTicket({ autoReplyState: 'sent' })
    await t.tickets.create(ticket)
    const res = await t.reply.autoReply(ticket.id, 'oi')
    expect(res.sent).toBe(false)
    expect(t.gmail.sent).toHaveLength(0)
  })

  it('falha no envio → auto_reply_state aborted (nunca reenvia)', async () => {
    const t = build()
    seedConnection(t.connections, t.secretBox)
    const id = await seedPending(t.tickets, t.messages)
    t.gmail.sendError = new GmailApiError('boom', 500, false)
    t.llm.queue = [CLS_OK, DRAFT_COVERED]

    await t.worker.tick()

    const ticket = await t.tickets.byId(id)
    expect(ticket?.autoReplyState).toBe('aborted')
    expect(ticket?.autoReplyReason).toContain('Falha no envio')
  })
})
