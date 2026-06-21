import { Elysia, t } from 'elysia'
import type { CancelSubscriptionService } from '../../../application/cancel-subscription/cancel-subscription.service'
import type { CreateSubscriptionCommand } from '../../../application/create-subscription/create-subscription.command'
import type { CreateSubscriptionService } from '../../../application/create-subscription/create-subscription.service'
import type { GetSubscriptionService } from '../../../application/get-subscription/get-subscription.service'
import { ValidationError } from '../../../domain/shared/errors'
import { sha256Hex } from '../../../infrastructure/security/hash'
import type { RateLimiter } from '../../../infrastructure/security/rate-limiter'
import { type AuthDeps, authenticateConsumer } from '../auth'
import { CreateSubscriptionBody } from '../dtos'
import { PayloadTooLargeError, TooManyRequestsError } from '../errors'
import { getRawBody, isOversizeBody } from '../raw-body'

export interface SubscriptionsRoutesDeps {
  auth: AuthDeps
  rateLimiter: RateLimiter
  createSubscription: CreateSubscriptionService
  getSubscription: GetSubscriptionService
  cancelSubscription: CancelSubscriptionService
}

const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

/**
 * Rotas de assinatura. Mesmo `derive` de autenticação das rotas de pagamento
 * (IP allowlist + HMAC) — só sistemas autorizados chegam aqui.
 */
export function subscriptionsRoutes(deps: SubscriptionsRoutesDeps) {
  return new Elysia({ prefix: '/subscriptions' })
    .derive(async ({ request, server, headers }) => {
      if (isOversizeBody(request)) throw new PayloadTooLargeError()
      const consumer = await authenticateConsumer(deps.auth, { request, server, headers })
      const limit = await deps.rateLimiter.check(consumer.id)
      if (!limit.allowed) throw new TooManyRequestsError(limit.retryAfterSeconds)
      return { consumer }
    })
    .post(
      '/',
      async ({ body, headers, request, consumer, set }) => {
        const idempotencyKey = headers['idempotency-key']
        if (!idempotencyKey) throw new ValidationError('Header Idempotency-Key é obrigatório')

        const command: CreateSubscriptionCommand = {
          consumerId: consumer.id,
          idempotencyKey,
          requestHash: sha256Hex(getRawBody(request)),
          amountInCents: body.amountInCents,
          intervalMonths: body.intervalMonths,
          repeats: body.repeats ?? null,
          description: body.description,
          customer: body.customer,
          card: body.card,
          metadata: body.metadata,
        }

        const view = await deps.createSubscription.execute(command)
        // Assinatura é sempre síncrona (o payment_token é de vida curta) → 201.
        set.status = 201
        return view
      },
      { body: CreateSubscriptionBody },
    )
    .get('/:id', ({ params, consumer }) => deps.getSubscription.execute(consumer.id, params.id), {
      params: t.Object({ id: t.String({ pattern: UUID_PATTERN }) }),
    })
    .delete(
      '/:id',
      ({ params, consumer }) => deps.cancelSubscription.execute(consumer.id, params.id),
      { params: t.Object({ id: t.String({ pattern: UUID_PATTERN }) }) },
    )
}
