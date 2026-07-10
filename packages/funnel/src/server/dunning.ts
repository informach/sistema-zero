import type { Lead } from '../db/repo'
import type { GatewayClient } from '../lib/gateway-client'
import { splitName } from './fulfillment'
import { toWhatsAppPhone } from './welcome-email'

export interface DunningDeps {
  gateway: GatewayClient
  /** Base do app do aluno ADULTO (link de atualizar pagamento) — funil `pro/*`. */
  communityUrl: string
  /** Base do app KIDS — funil `kids/*`. Ausente → cai no `communityUrl`. */
  kidsCommunityUrl?: string
  log?: (msg: string, meta?: Record<string, unknown>) => void
}

/**
 * Aviso de FALHA DE COBRANÇA de um ciclo de assinatura (dunning): "atualize seu
 * pagamento — seu acesso continua até o fim do ciclo + carência". Disparado pelo
 * webhook `payment.failed` com `subscriptionId`. BEST-EFFORT (nunca lança; falha
 * só loga — o acesso expira sozinho se o cliente não agir) e IDEMPOTENTE por
 * cobrança falha (`Idempotency-Key: dunning-<paymentId>` — a Efí pode retentar o
 * ciclo e re-falhar: cada falha é um paymentId novo → um aviso novo, correto).
 */
export function makeSendChargeFailed(
  deps: DunningDeps,
): (lead: Lead, failedPaymentId: string) => Promise<void> {
  return async (lead, failedPaymentId) => {
    if (!lead.email) return
    try {
      const { firstName } = splitName(lead.nome)
      const baseUrl = lead.funnel?.startsWith('kids/')
        ? (deps.kidsCommunityUrl ?? deps.communityUrl)
        : deps.communityUrl
      const variables = { nome: firstName, link: `${baseUrl}/compras` }

      const res = await deps.gateway.sendMessage(
        {
          channel: 'email',
          templateKey: 'subscription-charge-failed',
          recipient: { name: firstName, email: lead.email },
          variables,
        },
        `dunning-${failedPaymentId}`,
      )
      if (res.status !== 202 && res.status !== 200) {
        deps.log?.('dunning.send_failed', { leadId: lead.id, status: res.status })
        return
      }
      deps.log?.('dunning.sent', { leadId: lead.id, paymentId: failedPaymentId })

      const phone = toWhatsAppPhone(lead.telefone)
      if (phone) {
        await deps.gateway.sendMessage(
          {
            channel: 'whatsapp',
            templateKey: 'subscription-charge-failed',
            recipient: { name: firstName, phone },
            variables,
          },
          `dunning-wa-${failedPaymentId}`,
        )
      }
    } catch (err) {
      deps.log?.('dunning.send_failed', {
        leadId: lead.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
