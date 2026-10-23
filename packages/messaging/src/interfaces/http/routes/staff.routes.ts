import { UnauthorizedError } from '@sistemazero/core/http'
import { staffMessageSchema } from '@sistemazero/core/staff'
import { Elysia, t } from 'elysia'
import { z } from 'zod'
import type { GetMessageService } from '../../../application/get-message/get-message.service'
import type { SendMessageService } from '../../../application/send-message/send-message.service'
import { requireInternalToken } from '../auth'

export function staffRoutes(deps: {
  sendMessage: SendMessageService
  getMessage: GetMessageService
  internalToken?: string
  authConsumerId: string
}) {
  const guard = (headers: Record<string, string | undefined>) => {
    if (!deps.internalToken)
      throw new UnauthorizedError('Staff messaging requires gateway authentication')
    requireInternalToken(headers, deps.internalToken)
    if (headers['x-consumer-id'] !== deps.authConsumerId)
      throw new UnauthorizedError('Only the identity service may delegate staff operations')
  }
  return new Elysia()
    .post(
      '/messaging/staff/send',
      async ({ headers, body, set }) => {
        guard(headers)
        const parsed = z
          .object({ actorId: z.string().uuid(), message: staffMessageSchema })
          .strict()
          .safeParse(body)
        if (!parsed.success) {
          set.status = 400
          return { error: { code: 'INVALID_STAFF_MESSAGE' } }
        }
        const { actorId, message } = parsed.data
        const result = await deps.sendMessage.execute({
          ...message,
          consumerId: `staff:${actorId}`,
          idempotencyKey: message.intentId,
        })
        set.status = 202
        return result
      },
      { body: t.Unknown() },
    )
    .post(
      '/messaging/staff/status',
      async ({ headers, body, set }) => {
        guard(headers)
        const parsed = z
          .object({ actorId: z.string().uuid(), intentId: staffMessageSchema.shape.intentId })
          .strict()
          .safeParse(body)
        if (!parsed.success) {
          set.status = 400
          return { error: { code: 'INVALID_STAFF_RECEIPT' } }
        }
        return deps.getMessage.byIntent(`staff:${parsed.data.actorId}`, parsed.data.intentId)
      },
      { body: t.Unknown() },
    )
}
