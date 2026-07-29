import { PayloadTooLargeError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { AccessResolutionService } from '../../../application/access/access-resolution.service'
import type { ProcessedWebhookRepository } from '../../../domain/ports/processed-webhook-repository.port'
import { ValidationError } from '../../../domain/shared/errors'
import { GrantWebhookBody } from '../dtos'
import { getRawBody, isOversizeBody } from '../raw-body'
import { assertWebhookSignature } from '../webhook-auth'

/**
 * `x-delivery-id` vira PK `text` em `processed_webhooks` — gateway honesto manda
 * ids curtos; acima do teto → 400 (truncar criaria colisão de dedupe).
 */
const MAX_DELIVERY_ID_LENGTH = 200
function resolveDeliveryId(headers: Record<string, string | undefined>): string | null {
  const id = headers['x-delivery-id']
  if (!id) return null
  if (id.length > MAX_DELIVERY_ID_LENGTH)
    throw new ValidationError(`x-delivery-id excede ${MAX_DELIVERY_ID_LENGTH} caracteres`)
  return id
}

export interface WebhooksRoutesDeps {
  access: AccessResolutionService
  processed: ProcessedWebhookRepository
  webhookSecret: string
  toleranceSeconds: number
}

/**
 * Webhook de concessão/revogação (funil/members → gateway → hub). Invalida o
 * micro-cache de acesso a cursos do usuário — sem isso uma matrícula nova
 * demoraria o TTL inteiro para liberar um servidor `course_gated`. HMAC verificado
 * sobre o corpo BRUTO no `transform` (antes da validação → 401 antes de 422) +
 * dedupe por `x-delivery-id` (checa ANTES, marca só DEPOIS — invalidação é
 * idempotente, então a corrida benigna é inócua e o crash continua retryável).
 * Espelha o members.
 */
export function webhooksRoutes(deps: WebhooksRoutesDeps) {
  const verify = ({
    request,
    headers,
  }: {
    request: Request
    headers: Record<string, string | undefined>
  }) => {
    if (isOversizeBody(request)) throw new PayloadTooLargeError()
    assertWebhookSignature({
      secret: deps.webhookSecret,
      method: request.method,
      path: new URL(request.url).pathname,
      rawBody: getRawBody(request),
      deliveryId: headers['x-delivery-id'],
      signatureHeader: headers['x-signature'],
      toleranceSeconds: deps.toleranceSeconds,
    })
  }

  return new Elysia({ prefix: '/hub/webhooks' }).onTransform(verify).post(
    '/grant',
    async ({ headers, body }) => {
      const deliveryId = resolveDeliveryId(headers)
      if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
        return { ok: true, deduped: true }
      }
      deps.access.invalidate(body.userId)
      if (deliveryId) await deps.processed.markProcessed(deliveryId, body.event ?? 'grant')
      return { ok: true }
    },
    { body: GrantWebhookBody },
  )
}
