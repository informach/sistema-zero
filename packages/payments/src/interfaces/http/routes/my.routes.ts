import { ForbiddenError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import { z } from 'zod'
import type { CancelSubscriptionService } from '../../../application/cancel-subscription/cancel-subscription.service'
import type { GetMyPaymentService } from '../../../application/get-my-payment/get-my-payment.service'
import type { ListMyPaymentsService } from '../../../application/list-my-payments/list-my-payments.service'
import type { ListMySubscriptionsService } from '../../../application/list-my-subscriptions/list-my-subscriptions.service'
import type { UpdateSubscriptionCardService } from '../../../application/subscription-card/update-subscription-card.service'
import { AdminIdParam, MyPaymentsQuery } from '../dtos'
import { requireBuyer } from '../my-auth'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const EmptyCardIntentBody = z.strictObject({})
const CardExecutionBody = z.strictObject({
  paymentToken: z.string().min(1).max(255),
  card: z.strictObject({
    brand: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/),
    last4: z.string().regex(/^\d{4}$/),
  }),
})

export interface MyRoutesDeps {
  listMyPayments: ListMyPaymentsService
  getMyPayment: GetMyPaymentService
  listMySubscriptions: ListMySubscriptionsService
  cancelSubscription: CancelSubscriptionService
  updateSubscriptionCard: UpdateSubscriptionCardService
  cardConfig: { accountIdentifier?: string; environment: 'sandbox' | 'production' }
  /**
   * Token interno do gateway (`x-internal-token`) — prova de que o e-mail do
   * X-Auth-User-Email veio de lá. Ausente (dev/local) = checagem desligada.
   */
  internalToken?: string
}

/**
 * Rotas self-service do COMPRADOR ("minhas compras"/"minhas assinaturas", apps
 * community/kids). A auth real é do gateway (JWT, qualquer conta ativa —
 * inclusive `customer`); aqui lemos o e-mail do `X-Auth-User-Email` injetado
 * (`requireBuyer`). Caminho `/payments/my*` NÃO colide com as rotas consumer
 * (`/payments/:id` — o literal vence o param, tanto no matcher do gateway quanto
 * no Elysia) nem com `/payments/admin/*`. ⚠️ O literal `/payments/my/subscriptions`
 * também vence o param `/payments/my/:id` (coberto por teste nos dois matchers).
 * TODA consulta é escopada pelo e-mail — id alheio → 404 (anti-IDOR).
 */
export function myRoutes(deps: MyRoutesDeps) {
  const cardBuyer = (headers: Record<string, string | undefined>) => {
    const buyer = requireBuyer(headers, deps.internalToken)
    if (headers['x-auth-account-id'] || headers['x-auth-impersonator-id']) {
      throw new ForbiddenError(
        'Entre com a própria conta do responsável ou titular para alterar o cartão.',
      )
    }
    return buyer
  }
  return (
    new Elysia({ prefix: '/payments/my' })
      .get(
        '/',
        async ({ query, headers }) => {
          const { email } = requireBuyer(headers, deps.internalToken)
          return deps.listMyPayments.execute({
            email,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: MyPaymentsQuery },
      )
      // "Minhas assinaturas": ANTES do `/:id` (literal vence o param; a ordem
      // explícita evita depender só da precedência do router).
      .get('/subscriptions', async ({ headers }) => {
        const { email } = requireBuyer(headers, deps.internalToken)
        return deps.listMySubscriptions.execute(email)
      })
      .get('/card-config', ({ headers }) => {
        cardBuyer(headers)
        return {
          available: Boolean(deps.cardConfig.accountIdentifier),
          accountIdentifier: deps.cardConfig.accountIdentifier ?? null,
          environment: deps.cardConfig.environment,
        }
      })
      .get(
        '/subscriptions/:id/card-intents',
        async ({ params, headers }) => {
          const { email } = cardBuyer(headers)
          return deps.updateSubscriptionCard.getActiveIntent(email, params.id)
        },
        { params: AdminIdParam },
      )
      .post(
        '/subscriptions/:id/card-intents',
        async ({ params, headers }) => {
          const { email } = cardBuyer(headers)
          return deps.updateSubscriptionCard.createIntent(email, params.id)
        },
        { params: AdminIdParam, body: EmptyCardIntentBody },
      )
      .get(
        '/subscriptions/:id/card-intents/:intentId',
        async ({ params, headers }) => {
          const { email } = cardBuyer(headers)
          return deps.updateSubscriptionCard.getIntent(email, params.id, params.intentId)
        },
        {
          params: t.Object({
            id: t.String({ format: 'uuid' }),
            intentId: t.String({ format: 'uuid' }),
          }),
        },
      )
      .post(
        '/subscriptions/:id/card-intents/:intentId',
        async ({ params, headers, body }) => {
          const { email } = cardBuyer(headers)
          return deps.updateSubscriptionCard.execute(email, params.id, params.intentId, body)
        },
        {
          params: t.Object({
            id: t.String({ format: 'uuid' }),
            intentId: t.String({ format: 'uuid' }),
          }),
          // Standard Schema preserva a rejeição de extras; a normalização TypeBox
          // da aplicação não deve descartar silenciosamente PAN/CVV recebidos.
          body: CardExecutionBody,
        },
      )
      .delete(
        '/subscriptions/:id',
        async ({ params, headers }) => {
          const { email } = requireBuyer(headers, deps.internalToken)
          return deps.cancelSubscription.executeForEmail(email, params.id)
        },
        { params: AdminIdParam },
      )
      .get(
        '/:id',
        async ({ params, headers }) => {
          const { email } = requireBuyer(headers, deps.internalToken)
          return deps.getMyPayment.execute({ email, id: params.id })
        },
        { params: AdminIdParam },
      )
  )
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}
