import { randomUUID } from 'node:crypto'
import { ConnectionService } from '../src/application/connection/connection.service'
import { KbService } from '../src/application/kb/kb.service'
import { SettingsService } from '../src/application/settings/settings.service'
import { TicketService } from '../src/application/tickets/ticket.service'
import type { Ticket } from '../src/domain/ticket/ticket'
import type { TicketMessage } from '../src/domain/ticket/ticket-message'
import { loadEnv } from '../src/infrastructure/config/env'
import { createServer } from '../src/interfaces/http/server'
import {
  InMemoryConnectionRepository,
  InMemoryKbRepository,
  InMemoryMessageRepository,
  InMemoryOAuthStateRepository,
  InMemorySettingsRepository,
  InMemoryTicketRepository,
} from './fakes/in-memory'

export const INTERNAL_TOKEN = 'test-internal-token-1234'

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

export interface TestApp {
  app: { handle: (request: Request) => Promise<Response> }
  repos: {
    tickets: InMemoryTicketRepository
    messages: InMemoryMessageRepository
    kb: InMemoryKbRepository
    settings: InMemorySettingsRepository
    connections: InMemoryConnectionRepository
    oauthStates: InMemoryOAuthStateRepository
  }
}

/** Monta a app HTTP inteira sobre fakes in-memory (sem banco, sem Gmail). */
export function buildTestApp(): TestApp {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused-in-tests',
    INTERNAL_API_TOKEN: INTERNAL_TOKEN,
  })
  const now = () => new Date()
  const idGen = () => randomUUID()

  const tickets = new InMemoryTicketRepository()
  const messages = new InMemoryMessageRepository()
  const kb = new InMemoryKbRepository()
  const settings = new InMemorySettingsRepository()
  const connections = new InMemoryConnectionRepository()
  const oauthStates = new InMemoryOAuthStateRepository()

  const ticketService = new TicketService(tickets, messages, now)
  const kbService = new KbService(kb, now, idGen)
  const settingsService = new SettingsService(settings, now)
  const connectionService = new ConnectionService(connections)

  const app = createServer({
    env,
    logger: silentLogger,
    readiness: async () => ({ ready: true, checks: { db: 'ok' } }),
    tickets: {
      tickets: ticketService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    kb: {
      kb: kbService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    settings: {
      settings: settingsService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    connection: {
      connection: connectionService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
  })

  return { app, repos: { tickets, messages, kb, settings, connections, oauthStates } }
}

export const STAFF_USER_ID = '11111111-1111-4111-8111-111111111111'

/** Headers de uma chamada vinda do gateway com um membro da equipe autenticado. */
export function staffHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-internal-token': INTERNAL_TOKEN,
    'x-auth-user-id': STAFF_USER_ID,
    'x-auth-user-name': 'Helena Oliveira',
    'x-auth-user-role': 'staff',
    'x-auth-user-status': 'active',
    ...extra,
  }
}

/** Corpo JSON com tipo frouxo — os asserts dos testes conhecem o shape. */
// biome desliga noExplicitAny em tests/**
export async function json(res: Response): Promise<any> {
  return (await res.json()) as unknown
}

export function request(
  app: TestApp['app'],
  method: string,
  path: string,
  options: { headers?: Record<string, string>; body?: unknown } = {},
): Promise<Response> {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: options.headers ?? staffHeaders(),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
  )
}

/** Ticket pronto p/ semear os fakes (thread do Gmail com 1 inbound). */
export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  const at = new Date('2026-07-08T12:00:00Z')
  return {
    id: randomUUID(),
    version: 0,
    gmailThreadId: `thread-${randomUUID()}`,
    subject: 'Não consigo acessar o curso',
    status: 'new',
    category: null,
    categoryManual: false,
    priority: null,
    requesterName: 'Maria Silva',
    requesterEmail: 'maria@example.com',
    assignedTo: null,
    assignedToName: null,
    firstMessageAt: at,
    lastMessageAt: at,
    lastInboundAt: at,
    messageCount: 1,
    aiSummary: null,
    aiSummaryAt: null,
    aiDraft: null,
    aiDraftAt: null,
    aiDraftEdited: false,
    aiClassification: null,
    aiStatus: 'idle',
    aiNextAttemptAt: null,
    aiAttempts: 0,
    aiLastError: null,
    autoReplyState: 'none',
    autoRepliedAt: null,
    autoReplyReason: null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  }
}

/** Mensagem inbound pronta p/ semear os fakes. */
export function makeMessage(
  ticketId: string,
  overrides: Partial<TicketMessage> = {},
): TicketMessage {
  const at = new Date('2026-07-08T12:00:00Z')
  return {
    id: randomUUID(),
    ticketId,
    kind: 'email',
    gmailMessageId: `gm-${randomUUID()}`,
    rfc822MessageId: `<${randomUUID()}@mail.example.com>`,
    direction: 'inbound',
    sentVia: 'customer',
    fromEmail: 'maria@example.com',
    fromName: 'Maria Silva',
    toEmails: ['contato@sistemazero.com.br'],
    ccEmails: [],
    subject: 'Não consigo acessar o curso',
    bodyText: 'Olá, comprei o curso e não consigo acessar. Podem me ajudar?',
    bodyHtml: null,
    snippet: 'Olá, comprei o curso e não consigo acessar.',
    attachments: [],
    gmailInternalDate: at,
    createdBy: null,
    createdByName: null,
    createdAt: at,
    ...overrides,
  }
}
