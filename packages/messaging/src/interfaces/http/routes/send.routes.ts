import { Elysia } from 'elysia'
import type { GetMessageService } from '../../../application/get-message/get-message.service'
import type { SendMessageService } from '../../../application/send-message/send-message.service'
import { ValidationError } from '../../../domain/shared/errors'
import { requireInternalToken } from '../auth'
import { IdParams, SendBody } from '../dtos'

/** Tetos dos headers de idempotência (entram em índice único — sem teto, chave
 *  gigante infla o índice). Os consumidores reais usam ~40 chars. */
const MAX_IDEMPOTENCY_KEY_LENGTH = 200
const MAX_CONSUMER_ID_LENGTH = 100

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
        if ((headers['idempotency-key']?.length ?? 0) > MAX_IDEMPOTENCY_KEY_LENGTH) {
          throw new ValidationError(
            `Idempotency-Key acima de ${MAX_IDEMPOTENCY_KEY_LENGTH} caracteres`,
          )
        }
        if ((headers['x-consumer-id']?.length ?? 0) > MAX_CONSUMER_ID_LENGTH) {
          throw new ValidationError(`X-Consumer-Id acima de ${MAX_CONSUMER_ID_LENGTH} caracteres`)
        }
        const view = await deps.sendMessage.execute({
          channel: body.channel,
          templateKey: body.templateKey,
          recipient: body.recipient,
          variables: body.variables,
          attachments: body.attachments,
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
    .get(
      '/messaging/messages/:id',
      async ({ params, headers }) => {
        requireInternalToken(headers, deps.internalToken)
        return deps.getMessage.execute(params.id)
      },
      { params: IdParams },
    )
}
