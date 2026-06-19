import { Elysia, t } from 'elysia'
import type { GetPaymentService } from '../../../application/get-payment/get-payment.service'
import type { ProcessPaymentCommand } from '../../../application/process-payment/process-payment.command'
import type { ProcessPaymentService } from '../../../application/process-payment/process-payment.service'
import { ValidationError } from '../../../domain/shared/errors'
import { sha256Hex } from '../../../infrastructure/security/hash'
import type { RateLimiter } from '../../../infrastructure/security/rate-limiter'
import { type AuthDeps, authenticateConsumer } from '../auth'
import { ProcessPaymentBody } from '../dtos'
import { PayloadTooLargeError, TooManyRequestsError } from '../errors'
import { getRawBody, isOversizeBody } from '../raw-body'

export interface PaymentsRoutesDeps {
  auth: AuthDeps
  rateLimiter: RateLimiter
  processPayment: ProcessPaymentService
  getPayment: GetPaymentService
}

/**
 * Rotas de pagamento. O `derive` autentica o consumidor (IP allowlist + HMAC)
 * antes de qualquer handler deste grupo — apenas sistemas autorizados chegam aqui.
 */
export function paymentsRoutes(deps: PaymentsRoutesDeps) {
  return new Elysia({ prefix: '/payments' })
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

        const command: ProcessPaymentCommand = {
          consumerId: consumer.id,
          idempotencyKey,
          requestHash: sha256Hex(getRawBody(request)),
          amountInCents: body.amountInCents,
          method: body.method,
          description: body.description,
          payerMessage: body.payerMessage,
          expiresInSeconds: body.expiresInSeconds,
          customer: body.customer,
          card: body.card,
          boleto: body.boleto,
          metadata: body.metadata,
        }

        const view = await deps.processPayment.execute(command)
        // 201 quando a cobrança já saiu (modo síncrono, tem QR/boleto/cartão);
        // 202 quando foi só aceita e o worker vai criar a cobrança (modo assíncrono).
        // Cartão é sempre síncrono → sempre 201.
        set.status = view.pix || view.boleto || view.card ? 201 : 202
        return view
      },
      { body: ProcessPaymentBody },
    )
    .get('/:id', ({ params, consumer }) => deps.getPayment.execute(consumer.id, params.id), {
      // Valida o formato UUID (via pattern, garantidamente checado): um id
      // malformado iria à coluna `uuid` do Postgres e viraria 500 (poluindo
      // métricas) em vez de um 4xx limpo.
      params: t.Object({
        id: t.String({
          pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        }),
      }),
    })
}
