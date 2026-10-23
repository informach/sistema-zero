import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { UnauthorizedError } from '@sistemazero/core/http'
import { z } from 'zod'
import type { IncomingEvent } from '../../../domain/engagement/policy'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'

const identity = z.object({ id: z.string().min(1).max(200) })
const messaging = z.object({
  sender: identity,
  recipient: identity,
  timestamp: z.number().finite(),
  message: z
    .object({
      mid: z.string().max(500),
      text: z.string().max(20000).optional(),
      is_echo: z.boolean().optional(),
      app_id: z.union([z.string(), z.number()]).optional(),
      quick_reply: z.object({ payload: z.string().max(500) }).optional(),
      reply_to: z.object({ story: z.unknown().optional() }).optional(),
      attachments: z.array(z.unknown()).max(100).optional(),
    })
    .optional(),
  postback: z
    .object({ mid: z.string().max(500).optional(), payload: z.string().max(500) })
    .optional(),
  read: z.unknown().optional(),
  delivery: z.unknown().optional(),
  reaction: z.unknown().optional(),
})
const comment = z.object({
  field: z.literal('comments'),
  value: z.object({
    id: z.string().min(1).max(200),
    from: identity,
    media: identity,
    text: z.string().max(20000),
    created_time: z.union([z.string(), z.number()]).optional(),
  }),
})
const envelope = z.object({
  object: z.literal('instagram'),
  entry: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        time: z.number().finite(),
        messaging: z.array(z.unknown()).max(500).optional(),
        changes: z.array(z.unknown()).max(500).optional(),
      }),
    )
    .max(100),
})
export function verifyMetaSignature(raw: Uint8Array, signature: string | null, secret: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature))
    throw new UnauthorizedError('Assinatura Meta inválida')
  const expected = createHmac('sha256', secret).update(raw).digest(),
    actual = Buffer.from(signature.slice(7), 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new UnauthorizedError('Assinatura Meta inválida')
}
function instant(value: number) {
  const date = new Date(value > 10_000_000_000 ? value : value * 1000)
  if (!Number.isFinite(date.getTime())) return null
  return date.toISOString()
}
export function parseMetaEvents(raw: Uint8Array, ownAppId?: string): IncomingEvent[] {
  let json: unknown
  try {
    json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw))
  } catch {
    throw new WorkspaceError('VALIDATION_ERROR', 'JSON inválido no webhook')
  }
  const parsed = envelope.safeParse(json)
  if (!parsed.success) throw new WorkspaceError('VALIDATION_ERROR', 'Envelope Instagram inválido')
  const events: IncomingEvent[] = []
  for (const entry of parsed.data.entry) {
    for (const rawItem of entry.changes ?? []) {
      const item = comment.safeParse(rawItem)
      if (!item.success) continue // Unsupported subscription fields have no commercial effect.
      const value = item.data.value
      const at =
        typeof value.created_time === 'number'
          ? instant(value.created_time)
          : typeof value.created_time === 'string' &&
              Number.isFinite(Date.parse(value.created_time))
            ? new Date(value.created_time).toISOString()
            : instant(entry.time)
      if (!at) continue
      events.push({
        key: `comment:${value.id}`,
        accountExternalId: entry.id,
        recipient: value.from.id,
        at,
        kind: 'comment',
        text: value.text.slice(0, 2000),
        mediaId: value.media.id,
        commentId: value.id,
        postback: null,
        externalId: value.id,
      })
    }
    for (const rawItem of entry.messaging ?? []) {
      const item = messaging.safeParse(rawItem)
      if (!item.success) continue
      const value = item.data,
        msg = value.message
      if (value.read || value.delivery || value.reaction) continue
      if (msg?.is_echo && ownAppId && String(msg.app_id) === ownAppId) continue
      const echo = msg?.is_echo === true
      if ((!echo && value.recipient.id !== entry.id) || (echo && value.sender.id !== entry.id))
        continue
      const payload = value.postback?.payload ?? msg?.quick_reply?.payload ?? null
      const kind = echo
        ? 'echo'
        : payload
          ? 'postback'
          : msg?.reply_to?.story || msg?.attachments?.length
            ? 'unsupported'
            : msg
              ? 'message'
              : 'unsupported'
      const externalId = value.postback?.mid ?? msg?.mid ?? null
      const key = externalId
        ? `${kind}:${externalId}`
        : `${kind}:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`
      const at = instant(value.timestamp)
      if (!at) continue
      events.push({
        key,
        accountExternalId: entry.id,
        recipient: echo ? value.recipient.id : value.sender.id,
        at,
        kind,
        text: msg?.text?.slice(0, 2000) ?? null,
        mediaId: null,
        commentId: null,
        postback: payload,
        externalId,
      })
    }
  }
  if (events.length > 1000)
    throw new WorkspaceError('CONTEXT_TOO_LARGE', 'Excesso de eventos no webhook')
  return events
}
