import { Elysia } from 'elysia'
import type { GetMessageService } from '../../../application/get-message/get-message.service'
import type { SendMessageService } from '../../../application/send-message/send-message.service'
import { requireInternalToken } from '../auth'
import { SendBody } from '../dtos'

export interface SendRoutesDeps {
  sendMessage: SendMessageService
  getMessage: GetMessageService
  /** Token interno do gateway (S2S). Vazio → checagem desligada (dev). */
  internalToken: string | undefined
}

/**
 * Rotas de ENVIO (S2S, atrás do gateway). `POST /messaging/send` enfileira e
 * responde 202; `GET /messaging/messages/:id` consulta o status.
 */
export function sendRoutes(deps: SendRoutesDeps) {
  return new Elysia()
    .post(
      '/messaging/send',
      async ({ body, headers, set }) => {
        requireInternalToken(headers, deps.internalToken)
        const view = await deps.sendMessage.execute({
          channel: body.channel,
          templateKey: body.templateKey,
          recipient: body.recipient,
          variables: body.variables,
          senderId: body.senderId ?? null,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          priority: body.priority,
          consumerId: headers['x-consumer-id'] ?? null,
          idempotencyKey: headers['idempotency-key'] ?? null,
        })
        set.status = 202
        return view
      },
      { body: SendBody },
    )
    .get('/messaging/messages/:id', async ({ params, headers }) => {
      requireInternalToken(headers, deps.internalToken)
      return deps.getMessage.execute(params.id)
    })
}
