import type { FunnelRepo, Lead } from '../db/repo'
import type { GatewayClient } from '../lib/gateway-client'

export interface GrantMembersDeps {
  gateway: GatewayClient
  /**
   * Slug/id da oferta — usado como FALLBACK quando o lead não tem `offer_ref`
   * gravado (leads antigos / caminhos sem checkout). A oferta efetivamente comprada
   * vem do `lead.offerRef` (gravado no checkout) → suporta vender mais de uma oferta.
   */
  offerRef: string
  /** Marca a concessão concluída (one-shot) — poll repetido após pago não re-chama o members. */
  repo: Pick<FunnelRepo, 'setMembersGranted'>
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
 *
 * ONE-SHOT (`membersGrantedAt`, full review 06/2026): concessão concluída não é
 * re-chamada — cada poll pós-pago disparava um S2S real ao members (idempotente
 * lá, mas custo repetido aqui). Corrida webhook × polling pode chamar 2× (ambas
 * antes do marcador — inócuo, o members deduplica); o marcador corta as
 * repetições seguintes. Falha NÃO marca → o retry (reentrega/poll) continua.
 */
export function makeGrantMembers(deps: GrantMembersDeps): (lead: Lead) => Promise<void> {
  return async (lead: Lead) => {
    if (!lead.buyerUserId || !lead.paymentId) return
    if (lead.membersGrantedAt) return
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
    await deps.repo.setMembersGranted(lead.id, new Date())
    deps.log?.('grant.done', { leadId: lead.id, userId: lead.buyerUserId })
  }
}
