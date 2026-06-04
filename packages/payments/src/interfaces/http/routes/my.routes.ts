import { Elysia } from 'elysia'
import type { GetMyPaymentService } from '../../../application/get-my-payment/get-my-payment.service'
import type { ListMyPaymentsService } from '../../../application/list-my-payments/list-my-payments.service'
import { AdminIdParam, MyPaymentsQuery } from '../dtos'
import { requireBuyer } from '../my-auth'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface MyRoutesDeps {
  listMyPayments: ListMyPaymentsService
  getMyPayment: GetMyPaymentService
}

/**
 * Rotas self-service do COMPRADOR ("minhas compras", app community). A auth real
 * é do gateway (JWT, qualquer conta ativa — inclusive `customer`); aqui lemos o
 * e-mail do `X-Auth-User-Email` injetado (`requireBuyer`). Caminho `/payments/my*`
 * NÃO colide com as rotas consumer (`/payments/:id` — o literal vence o param,
 * tanto no matcher do gateway quanto no Elysia) nem com `/payments/admin/*`.
 * TODA consulta é escopada pelo e-mail — id alheio → 404 (anti-IDOR).
 */
export function myRoutes(deps: MyRoutesDeps) {
  return new Elysia({ prefix: '/payments/my' })
    .get(
      '/',
      async ({ query, headers }) => {
        const { email } = requireBuyer(headers)
        return deps.listMyPayments.execute({
          email,
          limit: clampLimit(query.limit),
          offset: query.offset ?? 0,
        })
      },
      { query: MyPaymentsQuery },
    )
    .get(
      '/:id',
      async ({ params, headers }) => {
        const { email } = requireBuyer(headers)
        return deps.getMyPayment.execute({ email, id: params.id })
      },
      { params: AdminIdParam },
    )
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}
