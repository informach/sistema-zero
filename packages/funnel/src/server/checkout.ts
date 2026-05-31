import type { FunnelRepo } from '../db/repo'
import type { GatewayClient } from '../lib/gateway-client'
import { json, jsonError } from '../lib/http'
import { getLeadId } from '../lib/lead-session'

export interface CheckoutDeps {
  repo: FunnelRepo
  gateway: GatewayClient
  productPriceCents: number
  productName: string
  productSku: string
}

interface PixData {
  txid: string
  copiaECola: string
  imagemQrcodeBase64?: string
  expiresAt: string | null
}
interface PaymentView {
  id: string
  status: string
  paidAt?: string | null
  pix?: PixData | null
}

/** POST /api/checkout/pix — cria a cobrança Pix via gateway (BFF) e devolve o QR. */
export async function startPix(request: Request, deps: CheckoutDeps): Promise<Response> {
  const leadId = getLeadId(request)
  if (!leadId) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const lead = await deps.repo.getLead(leadId)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')

  // O ebook é entregue por e-mail: sem contato, não há para quem entregar.
  // O modal de pré-checkout (/oferta) coleta nome/e-mail/telefone antes daqui.
  if (!lead.email) return jsonError('Finalize seus dados antes de pagar.', 409, 'NO_CONTACT')

  // Idempotência determinística por lead → retry aponta p/ a MESMA cobrança Pix.
  const idempotencyKey = `funil-${lead.id}`
  const input = {
    amountInCents: deps.productPriceCents,
    method: 'PIX',
    description: `${deps.productName} (ebook)`,
    payerMessage: 'Pagamento do ebook No Comando da IA',
    metadata: {
      leadId: lead.id,
      sku: deps.productSku,
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
    },
  }

  const { status, body } = await deps.gateway.createPayment(input, idempotencyKey)
  if (status !== 201 && status !== 202) {
    return jsonError('Não foi possível criar o pagamento.', 502, 'GATEWAY_ERROR')
  }
  const view = body as PaymentView
  await deps.repo.setPayment(lead.id, view.id)
  await deps.repo.insertEvent(lead.id, 'pagamento_iniciado', 'checkout')

  return json({ paymentId: view.id, status: view.status, pix: view.pix ?? null })
}

/** GET /api/checkout/:paymentId — consulta status via gateway; marca pago no polling. */
export async function pixStatus(
  request: Request,
  paymentId: string,
  deps: CheckoutDeps,
): Promise<Response> {
  const leadId = getLeadId(request)
  if (!leadId) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const lead = await deps.repo.getLead(leadId)
  if (!lead || lead.paymentId !== paymentId) {
    return jsonError('Pagamento não encontrado.', 404, 'NOT_FOUND')
  }

  const { status, body } = await deps.gateway.getPayment(paymentId)
  if (status !== 200) return jsonError('Falha ao consultar o pagamento.', 502, 'GATEWAY_ERROR')
  const view = body as PaymentView

  if (view.status === 'PAID') {
    const newlyPaid = await deps.repo.markPaid(lead.id, new Date())
    if (newlyPaid) await deps.repo.insertEvent(lead.id, 'pagamento_confirmado', 'checkout_polling')
  }

  return json({ status: view.status, paidAt: view.paidAt ?? null, pix: view.pix ?? null })
}
