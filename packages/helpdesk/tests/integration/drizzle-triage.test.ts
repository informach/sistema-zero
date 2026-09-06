import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { IngestedGmailMessage } from '../../src/domain/ports/ticket-ingestion-repository.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { tickets } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleSettingsRepository } from '../../src/infrastructure/persistence/drizzle/settings.repository'
import { DrizzleTicketRepository } from '../../src/infrastructure/persistence/drizzle/ticket.repository'
import { DrizzleTicketIngestionRepository } from '../../src/infrastructure/persistence/drizzle/ticket-ingestion.repository'
import { makeMessage, makeTicket } from '../helpers'

const databaseUrl = process.env.HELPDESK_TEST_DATABASE_URL
const integration = databaseUrl ? describe : describe.skip

if (databaseUrl && !/helpdesk_test/i.test(databaseUrl)) {
  throw new Error('HELPDESK_TEST_DATABASE_URL deve apontar para um banco descartável helpdesk_test')
}

/**
 * Espelho no Postgres REAL dos ramos de triagem da ingestão (o fake in-memory
 * reproduz a mesma regra; este teste é o que alcança o SQL).
 */
integration('triagem no Postgres', () => {
  let connection: DbConnection
  let ingestion: DrizzleTicketIngestionRepository
  let repository: DrizzleTicketRepository

  beforeAll(() => {
    if (!databaseUrl) return
    connection = createDbConnection(databaseUrl)
    ingestion = new DrizzleTicketIngestionRepository(connection.db)
    repository = new DrizzleTicketRepository(connection)
  })

  beforeEach(async () => {
    await connection.sql`truncate table helpdesk.ticket_messages, helpdesk.tickets, helpdesk.settings cascade`
  })

  afterAll(async () => {
    await connection.close()
  })

  const at = (iso: string) => new Date(iso)

  function gmailMessage(
    ticketId: string,
    overrides: Parameters<typeof makeMessage>[1] = {},
  ): IngestedGmailMessage {
    return { ...makeMessage(ticketId, overrides), gmailMessageId: `gmail-${randomUUID()}` }
  }

  async function seedHumanThread(status: 'waiting' | 'new' = 'waiting') {
    const inboundAt = at('2026-09-05T10:00:00Z')
    const ticket = makeTicket({
      status,
      firstMessageAt: inboundAt,
      lastMessageAt: inboundAt,
      lastInboundAt: inboundAt,
      aiGeneration: 1,
      aiStatus: 'done',
      createdAt: inboundAt,
      updatedAt: inboundAt,
    })
    await ingestion.ingest({
      ticket,
      message: gmailMessage(ticket.id, { gmailInternalDate: inboundAt, createdAt: inboundAt }),
      direction: 'inbound',
      aiEnabled: true,
      at: inboundAt,
    })
    await connection.db
      .update(tickets)
      .set({ status, aiStatus: 'done' })
      .where(eq(tickets.id, ticket.id))
    return { ticket, inboundAt }
  }

  it('automático em thread nova nasce closed/triado (o candidato do service é persistido como veio)', async () => {
    const alertAt = at('2026-09-05T09:00:00Z')
    const ticket = makeTicket({
      status: 'closed',
      resolvedAt: alertAt,
      lastInboundAt: null,
      aiGeneration: 0,
      aiStatus: 'skipped',
      triage: 'system',
      triageRule: 'system:sender-local-part',
      triagedAt: alertAt,
    })
    const result = await ingestion.ingest({
      ticket,
      message: gmailMessage(ticket.id, {
        fromEmail: 'no-reply@accounts.google.com',
        triage: 'system',
        triageRule: 'system:sender-local-part',
        isAutoreply: true,
      }),
      direction: 'inbound',
      aiEnabled: true,
      at: alertAt,
    })
    expect(result.status).toBe('created')
    expect(await repository.byId(ticket.id)).toMatchObject({
      status: 'closed',
      triage: 'system',
      triageRule: 'system:sender-local-part',
      aiStatus: 'skipped',
      lastInboundAt: null,
    })
  })

  it('auto-reply em ticket waiting só contabiliza: sem reabrir, sem SLA, sem IA', async () => {
    const { ticket, inboundAt } = await seedHumanThread('waiting')
    const oooAt = at('2026-09-05T11:00:00Z')
    const result = await ingestion.ingest({
      ticket: makeTicket({ gmailThreadId: ticket.gmailThreadId }),
      message: gmailMessage(ticket.id, {
        triage: 'auto_reply',
        triageRule: 'auto_reply:auto-submitted',
        isAutoreply: true,
        gmailInternalDate: oooAt,
        createdAt: oooAt,
      }),
      direction: 'inbound',
      aiEnabled: true,
      at: oooAt,
    })
    expect(result).toEqual({ status: 'appended', ticketId: ticket.id })
    expect(await repository.byId(ticket.id)).toMatchObject({
      status: 'waiting',
      triage: 'human',
      messageCount: 2,
      lastInboundAt: inboundAt,
      lastMessageAt: oooAt,
      aiStatus: 'done',
      aiGeneration: 1,
    })
  })

  it('bounce em ticket waiting reabre; em ticket triado não', async () => {
    const { ticket } = await seedHumanThread('waiting')
    const bounceAt = at('2026-09-05T11:00:00Z')
    await ingestion.ingest({
      ticket: makeTicket({ gmailThreadId: ticket.gmailThreadId }),
      message: gmailMessage(ticket.id, {
        fromEmail: 'mailer-daemon@googlemail.com',
        triage: 'bounce',
        triageRule: 'bounce:return-path-empty',
        isAutoreply: true,
        gmailInternalDate: bounceAt,
        createdAt: bounceAt,
      }),
      direction: 'inbound',
      aiEnabled: true,
      at: bounceAt,
    })
    expect(await repository.byId(ticket.id)).toMatchObject({
      status: 'open',
      resolvedAt: null,
      triage: 'human',
      aiStatus: 'done',
      aiGeneration: 1,
    })

    const internalAt = at('2026-09-05T08:00:00Z')
    const internal = makeTicket({
      status: 'closed',
      resolvedAt: internalAt,
      lastInboundAt: null,
      aiGeneration: 0,
      aiStatus: 'skipped',
      triage: 'internal',
      triageRule: 'internal:all-recipients-internal',
      triagedAt: internalAt,
      firstMessageAt: internalAt,
      lastMessageAt: internalAt,
    })
    await ingestion.ingest({
      ticket: internal,
      message: gmailMessage(internal.id, {
        direction: 'outbound',
        sentVia: 'gmail',
        triage: 'internal',
        triageRule: 'internal:all-recipients-internal',
        isAutoreply: true,
        gmailInternalDate: internalAt,
        createdAt: internalAt,
      }),
      direction: 'outbound',
      aiEnabled: true,
      at: internalAt,
    })
    await ingestion.ingest({
      ticket: makeTicket({ gmailThreadId: internal.gmailThreadId }),
      message: gmailMessage(internal.id, {
        fromEmail: 'mailer-daemon@googlemail.com',
        triage: 'bounce',
        triageRule: 'bounce:return-path-empty',
        gmailInternalDate: bounceAt,
        createdAt: bounceAt,
      }),
      direction: 'inbound',
      aiEnabled: true,
      at: bounceAt,
    })
    expect(await repository.byId(internal.id)).toMatchObject({
      status: 'closed',
      triage: 'internal',
      messageCount: 2,
    })
  })

  it('humano em thread triada promove mesmo fora de ordem; decisão manual vence', async () => {
    const oooAt = at('2026-09-05T11:00:00Z')
    const triaged = makeTicket({
      status: 'closed',
      resolvedAt: oooAt,
      lastInboundAt: null,
      aiGeneration: 0,
      aiStatus: 'skipped',
      triage: 'auto_reply',
      triageRule: 'auto_reply:auto-submitted',
      triagedAt: oooAt,
      firstMessageAt: oooAt,
      lastMessageAt: oooAt,
    })
    await ingestion.ingest({
      ticket: triaged,
      message: gmailMessage(triaged.id, {
        triage: 'auto_reply',
        triageRule: 'auto_reply:auto-submitted',
        gmailInternalDate: oooAt,
        createdAt: oooAt,
      }),
      direction: 'inbound',
      aiEnabled: true,
      at: oooAt,
    })
    const humanAt = at('2026-09-05T10:00:00Z') // mais ANTIGO que o auto-reply
    await ingestion.ingest({
      ticket: makeTicket({ gmailThreadId: triaged.gmailThreadId }),
      message: gmailMessage(triaged.id, { gmailInternalDate: humanAt, createdAt: humanAt }),
      direction: 'inbound',
      aiEnabled: true,
      at: humanAt,
    })
    expect(await repository.byId(triaged.id)).toMatchObject({
      status: 'new',
      resolvedAt: null,
      triage: 'human',
      triageRule: 'promoted:inbound',
      triagedAt: null,
      lastInboundAt: humanAt,
      lastMessageAt: oooAt,
      aiStatus: 'pending',
      aiGeneration: 1,
      messageCount: 2,
    })

    // Rebaixado à mão: inbound humano NÃO promove nem reabre.
    const demoted = makeTicket({
      status: 'closed',
      resolvedAt: oooAt,
      triage: 'system',
      triageRule: 'manual:demoted',
      triagedAt: oooAt,
      aiStatus: 'skipped',
      firstMessageAt: oooAt,
      lastMessageAt: oooAt,
    })
    await repository.create(demoted)
    const laterAt = at('2026-09-05T12:00:00Z')
    await ingestion.ingest({
      ticket: makeTicket({ gmailThreadId: demoted.gmailThreadId }),
      message: gmailMessage(demoted.id, { gmailInternalDate: laterAt, createdAt: laterAt }),
      direction: 'inbound',
      aiEnabled: true,
      at: laterAt,
    })
    // A mensagem entra na conversa (contabiliza), mas nada mais muda.
    expect(await repository.byId(demoted.id)).toMatchObject({
      status: 'closed',
      triage: 'system',
      triageRule: 'manual:demoted',
      aiStatus: 'skipped',
      messageCount: 2,
    })
  })

  it('a fila padrão esconde triados, o filtro automated os mostra, o painel os ignora e update() persiste a triagem', async () => {
    const now = at('2026-09-05T12:00:00Z')
    const human = makeTicket({
      firstMessageAt: at('2026-09-05T11:00:00Z'),
      lastInboundAt: at('2026-09-05T11:00:00Z'),
      lastMessageAt: at('2026-09-05T11:00:00Z'),
      createdAt: at('2026-09-05T11:00:00Z'),
    })
    const triaged = makeTicket({
      status: 'closed',
      resolvedAt: at('2026-09-05T11:30:00Z'),
      triage: 'system',
      triageRule: 'system:sender-local-part',
      triagedAt: at('2026-09-05T11:30:00Z'),
      lastInboundAt: null,
      createdAt: at('2026-09-05T11:30:00Z'),
    })
    await Promise.all([repository.create(human), repository.create(triaged)])

    const queue = await repository.list({ limit: 50, cursor: null }, now)
    expect(queue.items.map((t) => t.id)).toEqual([human.id])
    expect(queue.total).toBe(1)
    const automated = await repository.list({ triage: 'automated', limit: 50, cursor: null }, now)
    expect(automated.items.map((t) => t.id)).toEqual([triaged.id])

    const stats = await repository.stats(now)
    expect(stats.counts.new).toBe(1)
    expect(stats.resolvedToday).toBe(0)
    expect(stats.volume.at(-1)?.created).toBe(1)

    // update() mapeia coluna a coluna: a triagem tem que entrar lá.
    const stored = (await repository.byId(triaged.id))!
    stored.triage = 'human'
    stored.triageRule = 'manual:promoted'
    stored.triagedAt = null
    stored.status = 'new'
    expect(await repository.update(stored, stored.version)).toBe(true)
    expect(await repository.byId(triaged.id)).toMatchObject({
      triage: 'human',
      triageRule: 'manual:promoted',
      triagedAt: null,
      version: 1,
    })
  })

  it('settings guarda e devolve as regras de triagem (jsonb)', async () => {
    const settings = new DrizzleSettingsRepository(connection.db)
    expect((await settings.get()).triageRules).toEqual({
      ignoredSenders: [],
      internalDomains: ['sistemazero.com.br'],
    })
    const current = await settings.get()
    current.triageRules = {
      ignoredSenders: ['@evolution.example'],
      internalDomains: ['sistemazero.com.br'],
    }
    await settings.update(current)
    expect((await settings.get()).triageRules).toEqual(current.triageRules)
  })
})
