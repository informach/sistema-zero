import { randomUUID } from 'node:crypto'
import { TicketAiService } from '../src/application/ai/ticket-ai.service'
import { ConnectionService } from '../src/application/connection/connection.service'
import { GmailAccountService } from '../src/application/connection/gmail-account.service'
import { OAuthService } from '../src/application/connection/oauth.service'
import { KbService } from '../src/application/kb/kb.service'
import { SettingsService } from '../src/application/settings/settings.service'
import { CustomerTicketService } from '../src/application/tickets/customer-ticket.service'
import { ReplyService } from '../src/application/tickets/reply.service'
import { TicketService } from '../src/application/tickets/ticket.service'
import type { Ticket } from '../src/domain/ticket/ticket'
import type { TicketMessage } from '../src/domain/ticket/ticket-message'
import { loadEnv } from '../src/infrastructure/config/env'
import { PortalNotificationWorker } from '../src/infrastructure/workers/portal-notification-worker'
import { createServer } from '../src/interfaces/http/server'
import { FakeLlmClient } from './fakes/ai'
import { FakeGmailClient, FakeGmailOAuthProvider, FakeSecretBox } from './fakes/gmail'
import {
  InMemoryConnectionRepository,
  InMemoryCustomerTicketRepository,
  InMemoryKbRepository,
  InMemoryMessageRepository,
  InMemoryOAuthStateRepository,
  InMemoryPortalNotificationOutboxRepository,
  InMemoryReplyDeliveryRepository,
  InMemorySettingsRepository,
  InMemoryTicketRepository,
} from './fakes/in-memory'
import { FakeMessagingGateway } from './fakes/messaging'

export const INTERNAL_TOKEN = 'test-internal-token-1234'

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

export const TEST_APP_URL = 'http://app.test'
export const TEST_GATEWAY_URL = 'http://gateway.test'
/** Origens públicas das áreas do aluno nos testes (link do aviso de resposta). */
export const TEST_PORTAL_URLS = { adult: 'https://community.test', kids: 'https://kids.test' }

export interface TestApp {
  app: { handle: (request: Request) => Promise<Response> }
  repos: {
    tickets: InMemoryTicketRepository
    messages: InMemoryMessageRepository
    kb: InMemoryKbRepository
    settings: InMemorySettingsRepository
    connections: InMemoryConnectionRepository
    oauthStates: InMemoryOAuthStateRepository
    notificationOutbox: InMemoryPortalNotificationOutboxRepository
  }
  provider: FakeGmailOAuthProvider
  gmailClient: FakeGmailClient
  secretBox: FakeSecretBox
  llm: FakeLlmClient
  /** Avisos de resposta do portal capturados (gateway → messaging fake). */
  messaging: FakeMessagingGateway
  notificationWorker: PortalNotificationWorker | null
}

/** Monta a app HTTP inteira sobre fakes in-memory (sem banco, sem Gmail real). */
export function buildTestApp(
  overrides: { gmailEnabled?: boolean; messagingEnabled?: boolean } = {},
): TestApp {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused-in-tests',
    INTERNAL_API_TOKEN: INTERNAL_TOKEN,
  })
  const now = () => new Date()
  const idGen = () => randomUUID()
  const gmailEnabled = overrides.gmailEnabled ?? false
  // Aviso do portal LIGADO por padrão: é o caminho comum em produção.
  const messagingEnabled = overrides.messagingEnabled ?? true
  const messaging = new FakeMessagingGateway()

  const tickets = new InMemoryTicketRepository()
  const messages = new InMemoryMessageRepository()
  const customerTickets = new InMemoryCustomerTicketRepository(tickets, messages)
  const notificationOutbox = new InMemoryPortalNotificationOutboxRepository()
  const replyDelivery = new InMemoryReplyDeliveryRepository(tickets, messages, notificationOutbox)
  const kb = new InMemoryKbRepository()
  const settings = new InMemorySettingsRepository()
  const connections = new InMemoryConnectionRepository()
  const oauthStates = new InMemoryOAuthStateRepository()
  const provider = new FakeGmailOAuthProvider()
  const gmailClient = new FakeGmailClient()
  const secretBox = new FakeSecretBox()
  const llm = new FakeLlmClient()

  const ticketService = new TicketService(tickets, messages, now, idGen)
  const customerTicketService = new CustomerTicketService(
    customerTickets,
    messages,
    { aiEnabled: false },
    now,
    idGen,
  )
  const kbService = new KbService(kb, now, idGen)
  const settingsService = new SettingsService(settings, now)
  const revokeDeps = gmailEnabled ? { provider, secretBox } : null
  const connectionService = new ConnectionService(connections, revokeDeps, now, silentLogger)
  const oauthService = new OAuthService(
    oauthStates,
    connections,
    gmailEnabled
      ? {
          secretBox,
          redirectBaseUrl: TEST_GATEWAY_URL,
          appUrl: TEST_APP_URL,
          mailboxAddress: 'contato@sistemazero.com.br',
        }
      : null,
    gmailEnabled ? provider : null,
    gmailClient,
    { stateTtlMinutes: 10 },
    now,
    idGen,
    silentLogger,
  )
  const gmailAccountService = new GmailAccountService(
    connections,
    gmailEnabled ? { provider, secretBox } : null,
    now,
    silentLogger,
  )
  const replyService = new ReplyService(
    tickets,
    messages,
    replyDelivery,
    connections,
    settings,
    gmailAccountService,
    gmailClient,
    { fromName: 'Sistema Zero' },
    TEST_PORTAL_URLS,
    now,
    idGen,
    silentLogger,
  )
  const ticketAiService = new TicketAiService(
    llm,
    tickets,
    messages,
    async () => [],
    { maxThreadChars: 24_000, maxKbChars: 12_000 },
    now,
  )
  const notificationWorker = messagingEnabled
    ? new PortalNotificationWorker({
        outbox: notificationOutbox,
        messaging,
        now,
        logger: silentLogger,
        config: {
          intervalMs: 1_000,
          leaseMs: 30_000,
          retryBaseMs: 1_000,
          retryMaxMs: 60_000,
        },
      })
    : null

  const app = createServer({
    env,
    logger: silentLogger,
    readiness: async () => ({ ready: true, checks: { db: 'ok' } }),
    tickets: {
      tickets: ticketService,
      reply: replyService,
      ai: ticketAiService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
    customerTickets: {
      tickets: customerTicketService,
      internalToken: INTERNAL_TOKEN,
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
    oauth: {
      oauth: oauthService,
      internalToken: INTERNAL_TOKEN,
      requireStaffEnabled: true,
    },
  })

  return {
    app,
    repos: { tickets, messages, kb, settings, connections, oauthStates, notificationOutbox },
    provider,
    gmailClient,
    secretBox,
    llm,
    messaging,
    notificationWorker,
  }
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

export const CUSTOMER_USER_ID = '22222222-2222-4222-8222-222222222222'

/** Headers de uma conta responsável autenticada e injetada pelo gateway. */
export function customerHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-internal-token': INTERNAL_TOKEN,
    'x-auth-user-id': CUSTOMER_USER_ID,
    'x-auth-user-email': 'maria@example.com',
    'x-auth-user-name': 'Maria Silva',
    'x-auth-user-role': 'customer',
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
    source: 'email',
    portal: null,
    subject: 'Não consigo acessar o curso',
    status: 'new',
    resolvedAt: null,
    category: null,
    categoryManual: false,
    priority: null,
    requesterName: 'Maria Silva',
    requesterEmail: 'maria@example.com',
    requesterAccountId: null,
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
    aiGeneration: 1,
    aiStatus: 'idle',
    aiNextAttemptAt: null,
    aiAttempts: 0,
    aiLastError: null,
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
    visibility: 'customer',
    gmailMessageId: `gm-${randomUUID()}`,
    rfc822MessageId: `<${randomUUID()}@mail.example.com>`,
    deliveryState: 'sent',
    deliveryLastError: null,
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
    isAutoreply: false,
    gmailInternalDate: at,
    createdBy: null,
    createdByName: null,
    createdAt: at,
    ...overrides,
  }
}
