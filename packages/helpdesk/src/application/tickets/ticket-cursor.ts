import type { TicketQueueCursor } from '../../domain/ports/ticket-repository.port'
import type { Ticket } from '../../domain/ticket/ticket'
import { ticketQueuePosition } from '../../domain/ticket/ticket-sla'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Cursor opaco da ordenação operacional, incluindo o relógio usado pelo SLA. */
export function encodeTicketCursor(ticket: Ticket, snapshotAt: Date): string {
  const position = ticketQueuePosition(ticket, snapshotAt)
  return Buffer.from(
    JSON.stringify({
      v: 1,
      snapshotAt: snapshotAt.toISOString(),
      operationalRank: position.operationalRank,
      deadlineAt: position.deadlineAt.toISOString(),
      lastMessageAt: ticket.lastMessageAt.toISOString(),
      id: ticket.id,
    }),
  ).toString('base64url')
}

export function decodeTicketCursor(value: string | undefined): TicketQueueCursor | null {
  if (value === undefined || value.length === 0 || value.length > 1024) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('v' in parsed) ||
      parsed.v !== 1 ||
      !('snapshotAt' in parsed) ||
      typeof parsed.snapshotAt !== 'string' ||
      !('operationalRank' in parsed) ||
      typeof parsed.operationalRank !== 'number' ||
      !Number.isInteger(parsed.operationalRank) ||
      parsed.operationalRank < 0 ||
      parsed.operationalRank > 3 ||
      !('deadlineAt' in parsed) ||
      typeof parsed.deadlineAt !== 'string' ||
      !('lastMessageAt' in parsed) ||
      typeof parsed.lastMessageAt !== 'string' ||
      !('id' in parsed) ||
      typeof parsed.id !== 'string' ||
      !UUID_PATTERN.test(parsed.id)
    ) {
      return null
    }
    const snapshotAt = new Date(parsed.snapshotAt)
    const deadlineAt = new Date(parsed.deadlineAt)
    const lastMessageAt = new Date(parsed.lastMessageAt)
    if ([snapshotAt, deadlineAt, lastMessageAt].some((date) => Number.isNaN(date.getTime()))) {
      return null
    }
    return {
      snapshotAt,
      operationalRank: parsed.operationalRank,
      deadlineAt,
      lastMessageAt,
      id: parsed.id,
    }
  } catch {
    return null
  }
}
