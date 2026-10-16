import { randomUUID } from 'node:crypto'
import { DEFAULT_AUTOMATION_POLICY, type HandoffReason } from '@sistemazero/helpdesk-contracts'
import { and, eq, inArray, sql } from 'drizzle-orm'
import {
  AUTOMATION_DEADLINE_MS,
  inCohort,
  ineligibleReason,
} from '../../../domain/ticket/automation'
import type { Ticket, TicketStatus } from '../../../domain/ticket/ticket'
import type { Database } from './db'
import { automationJobs, automationPolicy, tickets } from './schema'
import { recordAutomationHandoff } from './ticket-events'

export type HelpdeskTx = Parameters<Parameters<Database['transaction']>[0]>[0]

/** All automated writers lock policy -> ticket -> job -> sorted articles. */
export async function lockAutomationPolicy(tx: HelpdeskTx) {
  await tx
    .insert(automationPolicy)
    .values({ id: 'default', policy: DEFAULT_AUTOMATION_POLICY })
    .onConflictDoNothing()
  const [policy] = await tx
    .select()
    .from(automationPolicy)
    .where(eq(automationPolicy.id, 'default'))
    .for('update')
  if (!policy) throw new Error('Automation policy absent')
  return policy
}

/** Only operational staff commands use this set; reads and copilots do not. */
export function humanTakeoverSet(at: Date, status?: TicketStatus) {
  return {
    handlingMode: 'human' as const,
    humanTakeover: true,
    handlingEpoch: sql`${tickets.handlingEpoch} + 1`,
    handoffReason: 'staff_intervention' as const,
    humanSlaStartedAt: sql`coalesce(${tickets.humanSlaStartedAt}, ${tickets.automationStartedAt})`,
    status:
      status ??
      sql`case when ${tickets.handlingMode} = 'assistant' and ${tickets.status} in ('new','open','waiting') then 'open'::helpdesk.ticket_status else ${tickets.status} end`,
    updatedAt: at,
  }
}
export async function supersedeJobs(tx: HelpdeskTx, ticketId: string, at: Date) {
  await tx
    .update(automationJobs)
    .set({
      state: 'superseded',
      finishedAt: at,
      reason: 'staff_intervention',
      leaseToken: null,
      leaseExpiresAt: null,
    })
    .where(
      and(
        eq(automationJobs.ticketId, ticketId),
        inArray(automationJobs.state, ['pending', 'processing']),
      ),
    )
}
export async function handoffTicket(
  tx: HelpdeskTx,
  ticket: Ticket,
  reason: HandoffReason,
  at: Date,
) {
  const [saved] = await tx
    .update(tickets)
    .set({
      ...humanTakeoverSet(at),
      handoffReason: reason,
      version: sql`${tickets.version}+1`,
      status: ticket.status === 'closed' || ticket.status === 'resolved' ? ticket.status : 'open',
    })
    .where(eq(tickets.id, ticket.id))
    .returning()
  if (saved) await recordAutomationHandoff(tx, ticket, reason, at)
  await tx
    .update(automationJobs)
    .set({ state: 'handoff', reason, finishedAt: at, leaseToken: null, leaseExpiresAt: null })
    .where(
      and(
        eq(automationJobs.ticketId, ticket.id),
        inArray(automationJobs.state, ['pending', 'processing']),
      ),
    )
  return saved ?? ticket
}

export async function scheduleAutomation(
  tx: HelpdeskTx,
  ticket: Ticket,
  question: string,
  at: Date,
  policy: typeof automationPolicy.$inferSelect,
  aiEnabled: boolean,
  isNew = false,
): Promise<Ticket> {
  if (!isNew && !ticket.automationStartedAt) return ticket
  const reason = ineligibleReason(ticket, question, policy.policy)
  if (ticket.handlingMode === 'assistant' && (reason || policy.policy.mode === 'off' || !aiEnabled))
    return handoffTicket(tx, ticket, reason ?? 'policy_changed', at)
  if (
    reason ||
    !aiEnabled ||
    policy.policy.mode === 'off' ||
    !ticket.requesterAccountId ||
    !inCohort(ticket.requesterAccountId, policy.policy.cohortPercent)
  )
    return ticket
  if (ticket.automationReplies >= 3) return handoffTicket(tx, ticket, 'turn_limit', at)
  const mode = policy.policy.mode
  let current = ticket
  {
    const [updated] = await tx
      .update(tickets)
      .set({
        handlingMode: mode === 'pilot' ? 'assistant' : 'human',
        automationStartedAt: ticket.automationStartedAt ?? at,
        handoffReason: null,
        ...(mode === 'pilot' ? { aiStatus: 'skipped' as const, aiNextAttemptAt: null } : {}),
      })
      .where(eq(tickets.id, ticket.id))
      .returning()
    if (updated) current = updated
  }
  await tx
    .insert(automationJobs)
    .values({
      id: randomUUID(),
      ticketId: ticket.id,
      generation: ticket.aiGeneration,
      epoch: ticket.handlingEpoch,
      policyVersion: policy.version,
      mode,
      nextAt: at,
      deadlineAt: new Date(at.getTime() + AUTOMATION_DEADLINE_MS),
      createdAt: at,
    })
    .onConflictDoNothing()
  return current
}
