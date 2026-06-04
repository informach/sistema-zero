import type { Lead } from '../db/repo'
import type { GatewayClient } from '../lib/gateway-client'

export interface GrantMembersDeps {
  gateway: GatewayClient
  /**
   * Slug/id da oferta — usado como FALLBACK quando o lead não tem `offer_ref`
   * gravado (leads antigos / caminhos sem checkout). A oferta efetivamente comprada
   * vem do `lead.offerRef` (gravado no checkout) → suporta vender mais de uma oferta.
   */
  offerRef: string
  log?: (msg: string, meta?: Record<string, unknown>) => void
}

/** Falha (transitória) na concessão → o chamador (webhook) deve permitir retry. */
export class GrantRetryError extends Error {
  constructor(readonly httpStatus: number) {
    super(`concessão de acesso falhou (status ${httpStatus})`)
    this.name = 'GrantRetryError'
  }
}

/**
 * Concede o acesso (área de membros) ao comprador JÁ REGISTRADO. Requer
 * `buyerUserId` (comprador novo → 201 do auth) + `paymentId`. Comprador recorrente
 * (409, sem id retornado) é pulado — concessão p/ recorrente é follow-up. A área
 * de membros é idempotente (chave derivada do pagamento), então reentregar é seguro.
 */
export function makeGrantMembers(deps: GrantMembersDeps): (lead: Lead) => Promise<void> {
  return async (lead: Lead) => {
    if (!lead.buyerUserId || !lead.paymentId) return
    const { status } = await deps.gateway.grantMembersAccess({
      userId: lead.buyerUserId,
      // Oferta efetivamente comprada (gravada no checkout); env é só fallback.
      offerRef: lead.offerRef ?? deps.offerRef,
      paymentId: lead.paymentId,
      paidAt: lead.paidAt ? lead.paidAt.toISOString() : undefined,
    })
    if (status !== 200 && status !== 201) {
      deps.log?.('grant.failed', { leadId: lead.id, status })
      throw new GrantRetryError(status)
    }
    deps.log?.('grant.done', { leadId: lead.id, userId: lead.buyerUserId })
  }
}
