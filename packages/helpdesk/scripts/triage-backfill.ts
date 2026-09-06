/**
 * Backfill da triagem para os tickets de e-mail que já existiam antes da
 * migration 0012. DRY-RUN por padrão; `--apply` grava. Roda DENTRO do container
 * do helpdesk (`bun run triage:backfill [--apply]`), pelo MESMO módulo
 * `triageEmail` da ingestão, sem SQL à mão.
 *
 * Decide por THREAD pelo invariante da ingestão, não por replay de eventos:
 * o ticket é atendimento se a PRIMEIRA mensagem é humana ou se alguma mensagem
 * inbound é humana; senão o veredito é o da primeira mensagem não-humana.
 * Primeiro as regras de ENDEREÇO (from/to/cc já estão no banco: decidem os 4 do
 * Google e os 32 internos); só quando o endereço diz `human` o script busca os
 * cabeçalhos no Gmail (token fresco lido na hora). Mensagem apagada no Gmail
 * mantém o veredito por endereço e é reportada. Nunca toca ticket `manual:*`.
 * Idempotente: re-run = 0 mudanças.
 */
import { createLogger } from '@sistemazero/core/logging'
import { and, asc, eq } from 'drizzle-orm'
import { GmailAccountService } from '../src/application/connection/gmail-account.service'
import {
  type DEFAULT_TRIAGE_RULES,
  type TriageVerdict,
  triageEmail,
} from '../src/domain/mail/triage'
import type { GmailClient } from '../src/domain/ports/gmail-client.port'
import type { Ticket } from '../src/domain/ticket/ticket'
import type { TicketMessage } from '../src/domain/ticket/ticket-message'
import {
  canRetriage,
  demoteTicket,
  PROMOTED_BY_INBOUND_RULE,
  promoteTicket,
} from '../src/domain/ticket/ticket-triage'
import { aiConfig, gmailConfig, loadEnv } from '../src/infrastructure/config/env'
import { GoogleGmailClient } from '../src/infrastructure/gateways/google/gmail-client'
import { GmailOAuthProvider } from '../src/infrastructure/gateways/google/gmail-oauth-provider'
import { DrizzleConnectionRepository } from '../src/infrastructure/persistence/drizzle/connection.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { ticketMessages, tickets } from '../src/infrastructure/persistence/drizzle/schema'
import { DrizzleSettingsRepository } from '../src/infrastructure/persistence/drizzle/settings.repository'
import { applyAtomicTriageBackfill } from '../src/infrastructure/persistence/drizzle/triage-backfill.repository'
import { createSecretBox } from '../src/infrastructure/security/secret-box'

const apply = process.argv.includes('--apply')
if (apply && process.argv.includes('--dry-run')) {
  throw new Error('Use somente um modo: --apply ou --dry-run')
}

const env = loadEnv(process.env)
const logger = createLogger({ pretty: env.NODE_ENV !== 'production' })
const connection = createDbConnection(env.DATABASE_URL, { max: 2, ssl: env.DATABASE_SSL })
const db = connection.db
const now = () => new Date()

interface MessageDecision {
  message: TicketMessage
  verdict: TriageVerdict
  /** De onde veio o veredito: só endereço, ou cabeçalhos do Gmail. */
  source: 'address' | 'gmail' | 'gmail-missing'
}

interface TicketDecision {
  ticket: Ticket
  messages: MessageDecision[]
  target: { kind: TriageVerdict['kind']; rule: string; evidence: string | null }
  change: 'none' | 'demote' | 'retriage' | 'promote'
}

/** Token fresco lido UMA vez e na hora (o refresh regrava a linha da conexão). */
function gmailReader(): (() => Promise<{ gmail: GmailClient; accessToken: string } | null>) | null {
  const gmail = gmailConfig(env)
  if (!gmail) return null
  const secretBox = createSecretBox(gmail.encKeyBase64)
  const provider = new GmailOAuthProvider({
    clientId: gmail.clientId,
    clientSecret: gmail.clientSecret,
  })
  const connections = new DrizzleConnectionRepository(connection)
  const account = new GmailAccountService(connections, { provider, secretBox }, now, logger)
  const client = new GoogleGmailClient()
  let cached: Promise<{ gmail: GmailClient; accessToken: string } | null> | null = null
  return () => {
    cached ??= (async () => {
      const current = await connections.current()
      if (current?.status !== 'connected') return null
      return { gmail: client, accessToken: await account.getFreshAccessToken(current) }
    })()
    return cached
  }
}

async function decideTicket(
  ticket: Ticket,
  messages: TicketMessage[],
  rules: typeof DEFAULT_TRIAGE_RULES,
  readGmail: ReturnType<typeof gmailReader>,
  counters: { gmailFetched: number; gmailMissing: number },
): Promise<TicketDecision> {
  const decisions: MessageDecision[] = []
  for (const message of messages) {
    const direction = message.direction === 'outbound' ? 'outbound' : 'inbound'
    const base = {
      direction,
      fromEmail: message.fromEmail,
      toEmails: message.toEmails,
      ccEmails: message.ccEmails,
    } as const
    let verdict = triageEmail({ ...base, headers: {}, labelIds: [] }, rules)
    let source: MessageDecision['source'] = 'address'
    if (verdict.kind === 'human' && message.gmailMessageId && readGmail) {
      const reader = await readGmail()
      if (reader) {
        const parsed = await reader.gmail.getMessage(reader.accessToken, message.gmailMessageId)
        if (parsed) {
          counters.gmailFetched += 1
          verdict = triageEmail(
            { ...base, headers: parsed.headers, labelIds: parsed.labelIds },
            rules,
          )
          source = 'gmail'
        } else {
          counters.gmailMissing += 1
          source = 'gmail-missing'
        }
      }
    }
    decisions.push({ message, verdict, source })
  }

  const first = decisions[0]
  const humanInbound = decisions.some(
    (d) => d.message.direction === 'inbound' && d.verdict.kind === 'human',
  )
  const isHuman = humanInbound || first?.verdict.kind === 'human'
  const firstNonHuman = decisions.find((d) => d.verdict.kind !== 'human')
  const target = isHuman
    ? { kind: 'human' as const, rule: 'human', evidence: null }
    : {
        kind: firstNonHuman?.verdict.kind ?? ('human' as const),
        rule: firstNonHuman?.verdict.rule ?? 'human',
        evidence: firstNonHuman?.verdict.evidence ?? null,
      }

  let change: TicketDecision['change'] = 'none'
  if (target.kind === 'human' && ticket.triage !== 'human') change = 'promote'
  else if (target.kind !== 'human' && ticket.triage === 'human') change = 'demote'
  else if (
    target.kind !== 'human' &&
    (ticket.triage !== target.kind || ticket.triageRule !== target.rule)
  ) {
    change = 'retriage'
  }
  return { ticket, messages: decisions, target, change }
}

async function main(): Promise<void> {
  const rules = (await new DrizzleSettingsRepository(db).get()).triageRules
  const readGmail = gmailReader()
  const aiEnabled = aiConfig(env) !== null
  const counters = { gmailFetched: 0, gmailMissing: 0 }

  const candidates = (await db
    .select()
    .from(tickets)
    .where(eq(tickets.source, 'email'))
    .orderBy(asc(tickets.createdAt))) as Ticket[]

  const decisions: TicketDecision[] = []
  let skippedManual = 0
  for (const ticket of candidates) {
    if (!canRetriage(ticket)) {
      skippedManual += 1
      continue
    }
    const messages = (await db
      .select()
      .from(ticketMessages)
      .where(and(eq(ticketMessages.ticketId, ticket.id), eq(ticketMessages.kind, 'email')))
      .orderBy(
        asc(ticketMessages.gmailInternalDate),
        asc(ticketMessages.createdAt),
      )) as TicketMessage[]
    decisions.push(await decideTicket(ticket, messages, rules, readGmail, counters))
  }

  // Relatório por regra e por remetente (só o que muda ou já está triado).
  const byRule = new Map<string, number>()
  const bySender = new Map<string, number>()
  for (const d of decisions) {
    if (d.target.kind === 'human') continue
    byRule.set(
      `${d.target.kind} (${d.target.rule})`,
      (byRule.get(`${d.target.kind} (${d.target.rule})`) ?? 0) + 1,
    )
    const sender = d.messages[0]?.message.fromEmail ?? '?'
    bySender.set(sender, (bySender.get(sender) ?? 0) + 1)
  }
  for (const d of decisions) {
    if (d.change === 'none') continue
    console.log(
      `${d.change.padEnd(8)} ${d.ticket.id.slice(0, 8)} | ${d.ticket.status.padEnd(8)} ${d.ticket.triage.padEnd(10)} → ${d.target.kind.padEnd(10)} ${d.target.rule} | ${(d.ticket.subject ?? '').slice(0, 50)} | ${d.target.evidence ?? ''}`,
    )
  }
  console.log('--- por regra ---')
  for (const [rule, n] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${n}`)
  }
  console.log('--- por remetente (1ª mensagem) ---')
  for (const [sender, n] of [...bySender.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sender} ×${n}`)
  }

  let applied = 0
  let conflicts = 0
  let messagesChanged = 0
  if (apply) {
    for (const d of decisions) {
      const at = now()
      const changedMessages = d.messages.filter(
        (m) =>
          m.message.triage !== m.verdict.kind ||
          (m.message.triageRule ?? null) !== (m.verdict.kind === 'human' ? null : m.verdict.rule),
      )
      const ticket = d.ticket
      if (d.change === 'promote') {
        const lastHuman = [...d.messages]
          .reverse()
          .find((m) => m.message.direction === 'inbound' && m.verdict.kind === 'human')
        promoteTicket(ticket, {
          rule: PROMOTED_BY_INBOUND_RULE,
          at,
          lastHumanInboundAt: lastHuman
            ? (lastHuman.message.gmailInternalDate ?? lastHuman.message.createdAt)
            : null,
          aiEnabled,
        })
      } else if (d.target.kind !== 'human' && d.change !== 'none') {
        demoteTicket(ticket, {
          kind: d.target.kind as Exclude<TriageVerdict['kind'], 'human'>,
          rule: d.target.rule,
          at,
        })
        ticket.lastInboundAt = null // nunca houve inbound humano: SLA não arma
      }

      // Corrige também candidatos já triados que carreguem estado operacional
      // legado. A decisão usa o estado lido; a gravação continua protegida por CAS.
      const needsInvariantRepair =
        d.target.kind !== 'human' &&
        (ticket.status !== 'closed' ||
          ticket.aiStatus !== 'skipped' ||
          ticket.aiNextAttemptAt !== null)
      if (needsInvariantRepair) {
        demoteTicket(ticket, {
          kind: d.target.kind as Exclude<TriageVerdict['kind'], 'human'>,
          rule: d.target.rule,
          at,
        })
        ticket.lastInboundAt = null
      }

      if (d.change === 'none' && !needsInvariantRepair && changedMessages.length === 0) continue

      const expectedVersion = ticket.version
      const ok = await applyAtomicTriageBackfill(db, {
        ticket,
        expectedVersion,
        at,
        messages: changedMessages.map((message) => ({
          id: message.message.id,
          triage: message.verdict.kind,
          triageRule: message.verdict.kind === 'human' ? null : message.verdict.rule,
        })),
      })
      if (!ok) {
        conflicts += 1
        continue
      }
      if (d.change !== 'none') applied += 1
      messagesChanged += changedMessages.length
    }
  }

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    scanned: candidates.length,
    skippedManual,
    decided: decisions.length,
    unchanged: decisions.filter((d) => d.change === 'none').length,
    toDemote: decisions.filter((d) => d.change === 'demote').length,
    toPromote: decisions.filter((d) => d.change === 'promote').length,
    toRetriage: decisions.filter((d) => d.change === 'retriage').length,
    gmail: readGmail ? 'configured' : 'not-configured (só regras de endereço)',
    ...counters,
    ...(apply ? { applied, conflicts, messagesChanged } : {}),
  }
  console.log(`TRIAGE_BACKFILL ${JSON.stringify(summary)}`)
  if (conflicts > 0) process.exitCode = 1
}

try {
  await main()
} finally {
  await connection.close()
}
