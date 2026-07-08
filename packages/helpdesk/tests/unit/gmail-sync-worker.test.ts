import { describe, expect, it } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { GmailAccountService } from '../../src/application/connection/gmail-account.service'
import { IngestService } from '../../src/application/tickets/ingest.service'
import type { GmailConnection } from '../../src/domain/connection/gmail-connection'
import { GmailSyncWorker } from '../../src/infrastructure/workers/gmail-sync-worker'
import {
  FakeGmailClient,
  FakeGmailOAuthProvider,
  FakeSecretBox,
  makeParsedEmail,
} from '../fakes/gmail'
import {
  InMemoryConnectionRepository,
  InMemoryMessageRepository,
  InMemoryTicketRepository,
} from '../fakes/in-memory'

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} }
const MAILBOX = 'contato@sistemazero.com.br'
const NOW = new Date('2026-07-08T12:00:00Z')

function build() {
  const connections = new InMemoryConnectionRepository()
  const tickets = new InMemoryTicketRepository()
  const messages = new InMemoryMessageRepository()
  const gmail = new FakeGmailClient()
  const provider = new FakeGmailOAuthProvider()
  const secretBox = new FakeSecretBox()
  const now = () => NOW
  const gmailAccount = new GmailAccountService(
    connections,
    { provider, secretBox },
    now,
    silentLogger,
  )
  const ingest = new IngestService(
    tickets,
    messages,
    { aiEnabled: false },
    now,
    () => randomUUID(),
    silentLogger,
  )
  const worker = new GmailSyncWorker({
    connections,
    gmailAccount,
    gmail,
    ingest,
    now,
    logger: silentLogger,
    config: {
      intervalMs: 45_000,
      pollIntervalMs: 45_000,
      leaseMs: 120_000,
      maxAttempts: 5,
      backfillQuery: 'newer_than:7d',
      fetchBatchSize: 25,
      tokenRefreshMarginMs: 300_000,
    },
  })
  return { connections, tickets, messages, gmail, secretBox, worker }
}

function seedConnection(
  connections: InMemoryConnectionRepository,
  secretBox: FakeSecretBox,
  overrides: Partial<GmailConnection> = {},
): GmailConnection {
  const conn: GmailConnection = {
    id: randomUUID(),
    version: 0,
    emailAddress: MAILBOX,
    externalId: 'sub-1',
    accessTokenEnc: secretBox.seal('access-1'),
    refreshTokenEnc: secretBox.seal('refresh-1'),
    tokenExpiresAt: new Date(NOW.getTime() + 3600_000),
    scopes: [],
    status: 'connected',
    lastHistoryId: null,
    lastSyncAt: null,
    syncNextAt: new Date(NOW.getTime() - 1000),
    syncAttempts: 0,
    lastSyncError: null,
    connectedBy: '11111111-1111-4111-8111-111111111111',
    connectedByName: null,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
  connections.rows.set(conn.id, conn)
  return conn
}

describe('GmailSyncWorker', () => {
  it('backfill: importa a janela e semeia o lastHistoryId', async () => {
    const { connections, tickets, gmail, secretBox, worker } = build()
    const conn = seedConnection(connections, secretBox, { lastHistoryId: null })
    gmail.profile = { emailAddress: MAILBOX, historyId: '5000' }
    gmail.listPages = [{ ids: ['gm-1', 'gm-2'], nextPageToken: null }]
    gmail.messagesById.set(
      'gm-1',
      makeParsedEmail({ gmailMessageId: 'gm-1', gmailThreadId: 't-1' }),
    )
    gmail.messagesById.set(
      'gm-2',
      makeParsedEmail({ gmailMessageId: 'gm-2', gmailThreadId: 't-2' }),
    )

    await worker.tick()

    expect(tickets.rows.size).toBe(2)
    const updated = await connections.byId(conn.id)
    expect(updated?.lastHistoryId).toBe('5000')
    expect(updated?.lastSyncError).toBeNull()
    expect(updated?.syncAttempts).toBe(0)
    expect(updated?.syncNextAt.getTime()).toBe(NOW.getTime() + 45_000)
  })

  it('incremental: history.list traz ids novos e avança o lastHistoryId', async () => {
    const { connections, tickets, gmail, secretBox, worker } = build()
    const conn = seedConnection(connections, secretBox, { lastHistoryId: '5000' })
    gmail.historyPages = [
      { messageIds: ['gm-9'], historyId: '5010', nextPageToken: null, expired: false },
    ]
    gmail.messagesById.set(
      'gm-9',
      makeParsedEmail({ gmailMessageId: 'gm-9', gmailThreadId: 't-9' }),
    )

    await worker.tick()

    expect(tickets.rows.size).toBe(1)
    expect((await connections.byId(conn.id))?.lastHistoryId).toBe('5010')
  })

  it('history 404 (expirado): zera o lastHistoryId p/ o próximo tick refazer', async () => {
    const { connections, gmail, secretBox, worker } = build()
    const conn = seedConnection(connections, secretBox, { lastHistoryId: '1' })
    gmail.historyPages = [{ messageIds: [], historyId: null, nextPageToken: null, expired: true }]

    await worker.tick()

    expect((await connections.byId(conn.id))?.lastHistoryId).toBeNull()
  })

  it('pula labels de sistema (SPAM/TRASH/DRAFT/CHAT)', async () => {
    const { connections, tickets, gmail, secretBox, worker } = build()
    seedConnection(connections, secretBox, { lastHistoryId: null })
    gmail.profile = { emailAddress: MAILBOX, historyId: '10' }
    gmail.listPages = [{ ids: ['spam-1', 'good-1'], nextPageToken: null }]
    gmail.messagesById.set(
      'spam-1',
      makeParsedEmail({ gmailMessageId: 'spam-1', labelIds: ['SPAM'] }),
    )
    gmail.messagesById.set(
      'good-1',
      makeParsedEmail({ gmailMessageId: 'good-1', gmailThreadId: 't-ok' }),
    )

    await worker.tick()

    expect(tickets.rows.size).toBe(1)
  })

  it('reconexão/re-backfill não duplica (dedupe por gmail_message_id)', async () => {
    const { connections, tickets, messages, gmail, secretBox, worker } = build()
    const conn = seedConnection(connections, secretBox, { lastHistoryId: null })
    gmail.profile = { emailAddress: MAILBOX, historyId: '10' }
    gmail.messagesById.set(
      'gm-1',
      makeParsedEmail({ gmailMessageId: 'gm-1', gmailThreadId: 't-1' }),
    )

    gmail.listPages = [{ ids: ['gm-1'], nextPageToken: null }]
    await worker.tick()
    // força novo backfill (como numa reconexão)
    const reset = await connections.byId(conn.id)
    if (reset) {
      reset.lastHistoryId = null
      reset.syncNextAt = new Date(NOW.getTime() - 1000)
      await connections.update(reset)
    }
    gmail.listPages = [{ ids: ['gm-1'], nextPageToken: null }]
    await worker.tick()

    expect(tickets.rows.size).toBe(1)
    expect(messages.rows).toHaveLength(1)
  })

  it('sem refresh token e access vencido → needs_reauth (sai do radar do claim)', async () => {
    const { connections, secretBox, worker } = build()
    const conn = seedConnection(connections, secretBox, {
      refreshTokenEnc: null,
      tokenExpiresAt: new Date(NOW.getTime() - 1000),
    })

    await worker.tick()

    const updated = await connections.byId(conn.id)
    expect(updated?.status).toBe('needs_reauth')
    // claimDue só pega status='connected' → o próximo tick não pega esta conexão
    expect(await connections.claimDue(120_000, NOW)).toBeNull()
  })
})
