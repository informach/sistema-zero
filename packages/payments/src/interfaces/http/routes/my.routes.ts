import { Elysia } from 'elysia'
import type { CancelSubscriptionService } from '../../../application/cancel-subscription/cancel-subscription.service'
import type { GetMyPaymentService } from '../../../application/get-my-payment/get-my-payment.service'
import type { ListMyPaymentsService } from '../../../application/list-my-payments/list-my-payments.service'
import type { ListMySubscriptionsService } from '../../../application/list-my-subscriptions/list-my-subscriptions.service'
import { AdminIdParam, MyPaymentsQuery } from '../dtos'
import { requireBuyer } from '../my-auth'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface MyRoutesDeps {
  listMyPayments: ListMyPaymentsService
  getMyPayment: GetMyPaymentService
  listMySubscriptions: ListMySubscriptionsService
  cancelSubscription: CancelSubscriptionService
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
