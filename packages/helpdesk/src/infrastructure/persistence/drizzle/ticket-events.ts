import { randomUUID } from 'node:crypto'
import type { HandoffReason } from '@sistemazero/helpdesk-contracts'
import { and, eq } from 'drizzle-orm'
import type { Ticket } from '../../../domain/ticket/ticket'
import type { HelpdeskTx } from './automation-transactions'
import { automationHandoffs, resolutionEvents } from './schema'

/** Call with the locked preimage, after the transition succeeds in the same transaction. */
export async function recordAutomationHandoff(
  tx: HelpdeskTx,
  previous: Ticket,
  reason: HandoffReason,
  at: Date,
) {
  if (previous.handlingMode !== 'assistant') return
  if (!previous.automationStartedAt) throw new Error('Assistant ticket missing automation start')
  await tx.insert(automationHandoffs).values({
    id: randomUUID(),
    ticketId: previous.id,
    generation: previous.aiGeneration,
    reason,
    automationStartedAt: previous.automationStartedAt,
    createdAt: at,
  })
}

/** A terminal -> active transition reopens the last resolution, regardless of its author. */
export async function recordResolutionReopened(tx: HelpdeskTx, previous: Ticket, at: Date) {
  if (!['resolved', 'closed'].includes(previous.status)) return
  const [confirmation] = previous.resolvedAt
    ? await tx
        .select({ automated: resolutionEvents.automated })
        .from(resolutionEvents)
        .where(
          and(
            eq(resolutionEvents.ticketId, previous.id),
            eq(resolutionEvents.kind, 'confirmed'),
            eq(resolutionEvents.createdAt, previous.resolvedAt),
          ),
        )
        .limit(1)
    : []
  await tx.insert(resolutionEvents).values({
    id: randomUUID(),
    ticketId: previous.id,
    kind: 'reopened',
    automated: confirmation?.automated ?? false,
    generation: previous.aiGeneration,
    createdAt: at,
  })
}
