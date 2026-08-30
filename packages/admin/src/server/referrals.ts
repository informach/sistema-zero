import 'server-only'
import type { AmbassadorDetailView, AmbassadorListItemView, AmbassadorView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

export interface ListAmbassadorsParams {
  q?: string
  limit?: number
  offset?: number
}

/** Lista embaixadores: `GET /referrals/admin/ambassadors` (JWT + RBAC, staff+). */
export function listAmbassadors(
  p: ListAmbassadorsParams,
): Promise<GatewayResponse<{ items: AmbassadorListItemView[]; total: number }>> {
  return gatewayFetch('/referrals/admin/ambassadors', {
    query: { q: p.q, limit: p.limit, offset: p.offset },
  })
}

/**
 * Cria um embaixador (nome + e-mail): `POST /referrals/admin/ambassadors`. O
 * referrals gera código + página (capability-URL) e envia o e-mail do link;
 * `emailSent: false` = conta criada mas o e-mail falhou (a resposta traz o
 * `pageUrl` p/ copiar e mandar por qualquer canal).
 */
export function createAmbassador(
  body: unknown,
): Promise<GatewayResponse<{ ambassador: AmbassadorView; emailSent: boolean }>> {
  return gatewayFetch('/referrals/admin/ambassadors', { method: 'POST', body })
}

/** Detalhe + resgates do código: `GET /referrals/admin/ambassadors/:id`. */
export function getAmbassador(id: string): Promise<GatewayResponse<AmbassadorDetailView>> {
  return gatewayFetch(`/referrals/admin/ambassadors/${encodeURIComponent(id)}`)
}

/** Reenvia o e-mail do magic-link (não rotaciona o token). */
export function resendAmbassadorLink(id: string): Promise<GatewayResponse<{ sent: boolean }>> {
  return gatewayFetch(`/referrals/admin/ambassadors/${encodeURIComponent(id)}/resend-link`, {
    method: 'POST',
  })
}

/** Ativa/desativa (o código acompanha) e/ou rotaciona o token da página. */
export function patchAmbassador(
  id: string,
  body: unknown,
): Promise<GatewayResponse<{ ambassador: AmbassadorView }>> {
  return gatewayFetch(`/referrals/admin/ambassadors/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  })
}
