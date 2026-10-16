import { z } from 'zod'
import { CustomerTicketCursorInvalidError } from '../../domain/helpdesk-errors'
import type { MessageCursor } from '../../domain/ports/message-repository.port'

const CursorSchema = z
  .object({ v: z.literal(2), position: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) })
  .strict()
export function encodeMessageCursor(message: MessageCursor): string {
  return Buffer.from(JSON.stringify({ v: 2, position: message.position })).toString('base64url')
}
export function decodeMessageCursor(value: string | undefined): MessageCursor | undefined {
  if (value === undefined) return undefined
  try {
    return CursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
  } catch {
    throw new CustomerTicketCursorInvalidError()
  }
}
