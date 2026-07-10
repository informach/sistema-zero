import type { FunnelRepo, Lead } from '../db/repo'
import type { GatewayClient, GrantMembersInput } from '../lib/gateway-client'

export interface GrantMembersDeps {
  gateway: GatewayClient
  /**
   * Resolve a oferta pelo funil do lead — usado SÓ como fallback quando o lead não
   * tem `offer_ref` gravado (leads antigos). A oferta efetivamente comprada vem do
   * `lead.offerRef` (gravado no checkout). Lead legado sem funil cai no default;
   * chave desconhecida continua lançando (não inventa oferta).
   */
  resolveOffer: (funnel: string | null) => { offerSlug: string }
  /** Marca a concessão concluída (one-shot) — poll repetido após pago não re-chama o members. */
  repo: Pick<FunnelRepo, 'setMembersGranted' | 'accessPeriodForPayment'>
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
 * Monta o corpo do grant RAMIFICADO pelo tipo de compra do lead/cobrança.
 * `paidAtIso`: `undefined` = usa o `paidAt` do lead (compra original); `null` =
 * NÃO envia (o members usa "agora"); string = data explícita (ciclo do webhook).
 */
async function buildGrantInput(
  deps: GrantMembersDeps,
  lead: Lead,
  paymentId: string,
  paidAtIso?: string | null,
): Promise<GrantMembersInput> {
  const leadPaidAt = lead.paidAt ? lead.paidAt.toISOString() : undefined
  const input: GrantMembersInput = {
    userId: lead.buyerUserId as string,
    // Oferta efetivamente comprada (gravada no checkout); fallback resolve pelo funil.
    offerRef: lead.offerRef ?? deps.resolveOffer(lead.funnel).offerSlug,
    paymentId,
    paidAt: paidAtIso === null ? undefined : (paidAtIso ?? leadPaidAt),
  }
  if (lead.subscriptionId) {
    // ASSINATURA recorrente: o members cria/estende com validade = ciclo + carência.
    input.subscription = {
      subscriptionId: lead.subscriptionId,
      intervalMonths: lead.subscriptionIntervalMonths ?? null,
    }
    return input
  }
  // Compra por PERÍODO (anual à vista via Pix/boleto): validade fixa + carência.
  const months = await deps.repo.accessPeriodForPayment(paymentId)
  if (months && months > 0) input.accessPeriodMonths = months
  return input
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
    const input = await buildGrantInput(deps, lead, lead.paymentId)
    const { status } = await deps.gateway.grantMembersAccess(input)
    if (status !== 200 && status !== 201) {
      deps.log?.('grant.failed', { leadId: lead.id, status })
      throw new GrantRetryError(status)
    }
    await deps.repo.setMembersGranted(lead.id, new Date())
    deps.log?.('grant.done', { leadId: lead.id, userId: lead.buyerUserId })
  }
}

/**
 * ESTENDE a matrícula por um CICLO de renovação de assinatura (webhook
 * `payment.paid` com `subscriptionId` de lead já pago). SEM o gate one-shot
 * `membersGrantedAt` — cada renovação PRECISA re-chamar o members (que deduplica
 * pelo ciclo e só move a validade p/ frente). Falha → GrantRetryError (o gateway
 * re-entrega a delivery).
 */
export function makeExtendMembersForCycle(
  deps: GrantMembersDeps,
): (lead: Lead, cyclePaymentId: string, cyclePaidAtIso?: string) => Promise<void> {
  return async (lead, cyclePaymentId, cyclePaidAtIso) => {
    if (!lead.buyerUserId || !lead.subscriptionId) return
    // O `paidAt` é o do CICLO (payload do webhook; ausente → o members usa "agora")
    // — o do lead é a compra ORIGINAL e não moveria a validade da renovação.
    const input = await buildGrantInput(deps, lead, cyclePaymentId, cyclePaidAtIso ?? null)
    const { status } = await deps.gateway.grantMembersAccess(input)
    if (status !== 200 && status !== 201) {
      deps.log?.('grant.cycle_failed', { leadId: lead.id, status, paymentId: cyclePaymentId })
      throw new GrantRetryError(status)
    }
    deps.log?.('grant.cycle_done', { leadId: lead.id, paymentId: cyclePaymentId })
  }
}
