import { Elysia } from 'elysia'
import type { GetAdminPaymentService } from '../../../application/get-admin-payment/get-admin-payment.service'
import type { Logger } from '../../../infrastructure/logging/logger'
import { AdminIdParam } from '../dtos'
import { assertInternalCaller } from '../internal-auth'

export interface InternalRoutesDeps {
  /** Mesmo INTERNAL_API_TOKEN das rotas admin/my (obrigatório em prod). */
  internalToken?: string
  getPayment: GetAdminPaymentService
  logger: Logger
}

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
  return new Elysia({ prefix: '/payments/internal' }).get(
    '/payments/:id',
    async ({ params, headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      const view = await deps.getPayment.execute(params.id)
      deps.logger.info('payments.internal_read', { paymentId: params.id })
      return view
    },
    { params: AdminIdParam },
  )
}
