import { Elysia, t } from 'elysia'
import type { GetAdminPaymentService } from '../../../application/get-admin-payment/get-admin-payment.service'
import type { GetAdminSubscriptionService } from '../../../application/get-admin-subscription/get-admin-subscription.service'
import type { PaidOffersReader } from '../../../domain/ports/paid-offers-read.port'
import type { Logger } from '../../../infrastructure/logging/logger'
import { AdminIdParam } from '../dtos'
import { assertInternalCaller } from '../internal-auth'

export interface InternalRoutesDeps {
  /** Mesmo INTERNAL_API_TOKEN das rotas admin/my (obrigatório em prod). */
  internalToken?: string
  getPayment: GetAdminPaymentService
  getSubscription: GetAdminSubscriptionService
  /** Ofertas já pagas por um e-mail (a primeira assinatura do referrals). Sem ela, 503. */
  paidOffers?: PaidOffersReader
  logger: Logger
}

const UUID = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

/**
 * Leitura S2S para serviços internos (hoje: o fiscal, que precisa do pagamento
 * COMPLETO — customer/valor/metadata/status — pois o payload do webhook só traz
 * ids). Cross-consumer de propósito: o `GET /payments/:id` de consumidor é
 * escopado (404 p/ pagamento de outro dono) e o dono das vendas do funil é o
 * `gateway`, não o fiscal. Auth = `x-internal-token` (prova de origem interna,
 * `assertInternalCaller`); NÃO expor no gateway — chamada direta via private
 * networking. A view devolvida é a AdminPaymentView (sem dados de cartão).
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  return new Elysia({ prefix: '/payments/internal' })
    .get(
      '/payments/:id',
      async ({ params, headers }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
        const view = await deps.getPayment.execute(params.id)
        deps.logger.info('payments.internal_read', { paymentId: params.id })
        return view
      },
      { params: AdminIdParam },
    )
    .get(
      '/subscriptions/:id',
      async ({ params, headers }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
        const view = await deps.getSubscription.execute(params.id)
        // Origem temporal da compra para atribuição, sem cartão ou dados do cliente.
        return { id: view.id, createdAt: view.createdAt }
      },
      { params: AdminIdParam },
    )
    .get(
      '/customers/paid-offers',
      async ({ query, headers, set }) => {
        assertInternalCaller(headers['x-internal-token'], deps.internalToken)
        if (!deps.paidOffers) {
          set.status = 503
          return { code: 'PAID_OFFERS_UNAVAILABLE', message: 'Leitura indisponível.' }
        }
        const before = new Date(query.before)
        if (!Number.isFinite(before.getTime())) {
          set.status = 400
          return { code: 'VALIDATION_ERROR', message: 'Data inválida.' }
        }
        const offerIds = await deps.paidOffers.listPaidOfferIds({
          email: query.email,
          before,
          ...(query.exclude ? { excludePaymentId: query.exclude } : {}),
        })
        return { offerIds }
      },
      {
        query: t.Object({
          email: t.String({ minLength: 3, maxLength: 254 }),
          before: t.String({ minLength: 10, maxLength: 40 }),
          exclude: t.Optional(t.String({ pattern: UUID })),
        }),
      },
    )
}
