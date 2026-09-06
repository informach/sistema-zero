import type { TriageKind } from '@sistemazero/helpdesk-contracts'
import { eq } from 'drizzle-orm'
import type { Ticket } from '../../../domain/ticket/ticket'
import type { Database } from './db'
import { ticketMessages } from './schema'
import { updateTicketRow } from './ticket.repository'

export interface TriageBackfillMessageUpdate {
  id: string
  triage: TriageKind
  triageRule: string | null
}

/**
 * Persiste agregado e mensagens como uma unidade. O CAS vem antes das mensagens:
 * em conflito, nenhuma classificação parcial escapa da transação.
 */
export async function applyAtomicTriageBackfill(
  db: Database,
  input: {
    ticket: Ticket
    expectedVersion: number
    at: Date
    messages: TriageBackfillMessageUpdate[]
  },
): Promise<boolean> {
  input.ticket.updatedAt = input.at
  const applied = await db.transaction(async (tx) => {
    const ticketUpdated = await updateTicketRow(tx, input.ticket, input.expectedVersion)
    if (!ticketUpdated) return false

    for (const message of input.messages) {
      await tx
        .update(ticketMessages)
        .set({
          triage: message.triage,
          triageRule: message.triageRule,
          isAutoreply: message.triage !== 'human',
        })
        .where(eq(ticketMessages.id, message.id))
    }
    return true
  })
  if (applied) input.ticket.version = input.expectedVersion + 1
  return applied
}
