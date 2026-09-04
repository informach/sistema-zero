import type { CustomerTicketCursor } from '../../domain/ports/customer-ticket-repository.port'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Cursor opaco, estável pela ordenação `last_message_at DESC, id ASC`. */
export function encodeCustomerTicketCursor(ticket: { id: string; lastMessageAt: Date }): string {
  return Buffer.from(
    JSON.stringify({ id: ticket.id, lastMessageAt: ticket.lastMessageAt.toISOString() }),
  ).toString('base64url')
}

/** `null` representa cursor ausente ou inválido; o service conhece a diferença pelo input. */
export function decodeCustomerTicketCursor(value: string | undefined): CustomerTicketCursor | null {
  if (value === undefined || value.length === 0 || value.length > 256) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('id' in parsed) ||
      !('lastMessageAt' in parsed) ||
      typeof parsed.id !== 'string' ||
      typeof parsed.lastMessageAt !== 'string' ||
      !UUID_PATTERN.test(parsed.id)
    ) {
      return null
    }
    const lastMessageAt = new Date(parsed.lastMessageAt)
    if (Number.isNaN(lastMessageAt.getTime())) return null
    return { id: parsed.id, lastMessageAt }
  } catch {
    return null
  }
}
