/**
 * Evidence-only reproductions. No network, database, environment secrets or writes.
 * Run from the repository root:
 * bun run .audits/echo-helpdesk-2026-10-15/reproduce.ts [echo-root]
 * Exit 0 means all three documented findings were reproduced, NOT that bugs are fixed.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { selectRelevantKbArticles } from '../../packages/helpdesk/src/application/ai/kb-context'
import { buildThreadText } from '../../packages/helpdesk/src/application/ai/prompts'
import type { TicketMessage } from '../../packages/helpdesk/src/domain/ticket/ticket-message'

const echoRoot = resolve(
  process.argv[2] ?? 'C:/Users/tocha/Downloads/next15-echo-main/next15-echo-main',
)

const message: TicketMessage = {
  id: 'synthetic-message',
  ticketId: 'synthetic-ticket',
  kind: 'portal',
  visibility: 'customer',
  gmailMessageId: null,
  rfc822MessageId: null,
  deliveryState: null,
  deliveryLastError: null,
  direction: 'inbound',
  sentVia: 'customer',
  fromEmail: 'customer@example.test',
  fromName: 'Synthetic customer',
  toEmails: [],
  ccEmails: [],
  subject: 'Ajuda',
  bodyText: 'Nao consigo abrir a aula de programacao',
  bodyHtml: null,
  snippet: null,
  attachments: [],
  isAutoreply: false,
  triage: 'human',
  triageRule: null,
  gmailInternalDate: null,
  createdBy: null,
  createdByName: null,
  createdAt: new Date('2026-10-15T12:00:00Z'),
}

const portalText = buildThreadText('Ajuda', [message], 24_000)
const emailText = buildThreadText('Ajuda', [{ ...message, kind: 'email' }], 24_000)
const portalFinding = {
  reproduced: !portalText.includes(message.bodyText) && emailText.includes(message.bodyText),
  portalText,
  emailText,
}

const article = {
  title: 'Guia da plataforma',
  content: `${'Introducao geral. '.repeat(200)}Recuperar senha: abra Esqueci minha senha.`,
}
const selected = selectRelevantKbArticles('Recuperar senha', [article], 200)
const truncationFinding = {
  reproduced: selected.length === 1 && !selected[0]?.content.includes('Recuperar senha'),
  selectedArticles: selected.length,
  sourceContainsAnswer: article.content.includes('Recuperar senha'),
  selectedContainsAnswer: selected[0]?.content.includes('Recuperar senha'),
  selectedChars: selected[0]?.content.length,
  fixtureBudget: 200,
  productionDefaultBudget: 12_000,
}

// This file's handlers contain plain JS after removal of import/export statements.
// Wrappers and external dependencies are replaced with fixtures. No Convex runtime
// or deployed endpoint is invoked. Handler bodies remain unchanged.
type Args = { threadId: string; contactSessionId: string; prompt?: string; paginationOpts?: object }
type Context = {
  db?: { get: () => Promise<object> }
  runQuery?: () => Promise<object>
  runMutation?: () => Promise<void>
}
type Handler = { handler: (ctx: Context, args: Args) => Promise<{ page: { threadId: string }[] }> }

const pass = (value: unknown) => value
const validatorStub = new Proxy(() => ({}), { get: () => validatorStub })
const referenceStub = new Proxy({}, { get: () => referenceStub })
const generatedThreads: string[] = []
const sandbox = {
  v: validatorStub,
  ConvexError: class extends Error {
    constructor(value: { message: string }) {
      super(value.message)
    }
  },
  action: pass,
  query: pass,
  internal: referenceStub,
  components: referenceStub,
  paginationOptsValidator: {},
  escalateConversation: {},
  resolveConversation: {},
  search: {},
  saveMessage: async () => {},
  supportAgent: {
    listMessages: async (_ctx: unknown, args: { threadId: string }) => ({
      page: [{ text: 'synthetic foreign conversation', threadId: args.threadId }],
    }),
    generateText: async (_ctx: unknown, args: { threadId: string }) => {
      generatedThreads.push(args.threadId)
    },
  },
  Date,
  handlers: undefined as undefined | { create: Handler; getMany: Handler },
}
const sourcePath = resolve(echoRoot, 'packages/backend/convex/public/messages.ts')
const source = readFileSync(sourcePath, 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export const /gm, 'const ')
runInNewContext(`${source}\nglobalThis.handlers = { create, getMany };`, sandbox, { timeout: 1000 })
if (!sandbox.handlers) throw new Error('Could not load the Echo handlers')

const ownSession = { _id: 'session-a', organizationId: 'org-a', expiresAt: Date.now() + 60_000 }
const foreignConversation = {
  contactSessionId: 'session-b',
  organizationId: 'org-b',
  threadId: 'thread-b',
  status: 'unresolved',
}
const read = await sandbox.handlers.getMany.handler(
  { db: { get: async () => ownSession } },
  { contactSessionId: 'session-a', threadId: 'thread-b', paginationOpts: { numItems: 10, cursor: null } },
)
let queryIndex = 0
const queryResults = [ownSession, foreignConversation, { status: 'active' }]
await sandbox.handlers.create.handler(
  {
    runQuery: async () => {
      const result = queryResults[queryIndex++]
      if (!result) throw new Error('Unexpected query: inspect the updated handler')
      return result
    },
    runMutation: async () => {},
  },
  { contactSessionId: 'session-a', threadId: 'thread-b', prompt: 'synthetic test' },
)
const ownershipFinding = {
  reproduced: read.page[0]?.threadId === 'thread-b' && generatedThreads[0] === 'thread-b',
  readForeignThread: read.page[0]?.threadId,
  agentCalledForForeignThread: generatedThreads[0],
  expectedBehavior: 'Both handlers should reject a thread owned by another session',
  scope: 'Real handler source; mocked Convex and Agent dependencies; no deployment test',
}

const evidence = {
  date: '2026-10-15',
  fixtureOnly: true,
  networkCalls: 0,
  portalContext: portalFinding,
  kbTruncation: truncationFinding,
  echoOwnership: ownershipFinding,
}
console.log(JSON.stringify(evidence, null, 2))
if (![portalFinding, truncationFinding, ownershipFinding].every((finding) => finding.reproduced)) {
  throw new Error('A documented finding did not reproduce; recheck the source and report')
}
