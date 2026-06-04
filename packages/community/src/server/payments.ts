import 'server-only'
import type { Paginated, PaymentView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

/** "Minhas compras": o gateway injeta o e-mail das claims; o payments filtra por ele. */
export function listMyPayments(params: {
  limit?: number
  offset?: number
}): Promise<GatewayResponse<Paginated<PaymentView>>> {
  return gatewayFetch('/payments/my', {
    query: { limit: params.limit, offset: params.offset },
  })
}

export function getMyPayment(id: string): Promise<GatewayResponse<PaymentView>> {
  return gatewayFetch(`/payments/my/${encodeURIComponent(id)}`)
}
