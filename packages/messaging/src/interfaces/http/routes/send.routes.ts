import { UnauthorizedError } from '@sistemazero/core/http'
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

function optionalHeader(value: string | undefined, name: string, maxLength: number): string | null {
  if (value === undefined) return null
  const normalized = value.trim()
  if (normalized.length === 0) {
    throw new ValidationError(`${name} não pode ser vazio`)
  }
  if (normalized.length > maxLength) {
    throw new ValidationError(`${name} acima de ${maxLength} caracteres`)
  }
  return normalized
}

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
        const idempotencyKey = optionalHeader(
          headers['idempotency-key'],
          'Idempotency-Key',
          MAX_IDEMPOTENCY_KEY_LENGTH,
        )
        const consumerId = optionalHeader(
          headers['x-consumer-id'],
          'X-Consumer-Id',
          MAX_CONSUMER_ID_LENGTH,
        )
        const view = await deps.sendMessage.execute({
          channel: body.channel,
          templateKey: body.templateKey,
          recipient: body.recipient,
          variables: body.variables,
          attachments: body.attachments,
          senderId: body.senderId ?? null,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          priority: body.priority,
          consumerId,
          idempotencyKey,
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
        const consumerId = optionalHeader(
          headers['x-consumer-id'],
          'X-Consumer-Id',
          MAX_CONSUMER_ID_LENGTH,
        )
        if (deps.internalToken && !consumerId) {
          throw new UnauthorizedError('Consumer autenticado ausente')
        }
        return deps.getMessage.execute(params.id, consumerId)
      },
      { params: IdParams },
    )
}
