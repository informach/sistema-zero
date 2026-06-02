import type { FunnelRepo, Lead } from '../db/repo'
import {
  type AddressFormInput,
  BoletoFormSchema,
  CardChargeSchema,
  fieldErrors,
} from '../lib/checkout-schema'
import type { GatewayClient } from '../lib/gateway-client'
import { json, jsonError, safeJson } from '../lib/http'
import { getLeadId } from '../lib/lead-session'

export interface CheckoutDeps {
  repo: FunnelRepo
  gateway: GatewayClient
  productPriceCents: number
  productName: string
  productSku: string
  /**
   * Registra o comprador no IdP após o pagamento confirmado. Best-effort nos
   * caminhos de polling/cartão (o webhook é o backstop durável). Opcional para
   * não exigir mudança em chamadas/testes antigos.
   */
  fulfill?: (lead: Lead) => Promise<void>
}

interface PixData {
  txid: string
  copiaECola: string
  imagemQrcodeBase64?: string
  expiresAt: string | null
}
interface BoletoData {
  barcode: string
  digitableLine: string
  pdfUrl: string
  expiresAt: string | null
}
interface CardData {
  brand: string
  last4: string
  installments: number
}
interface PaymentView {
  id: string
  status: string
  paidAt?: string | null
  pix?: PixData | null
  boleto?: BoletoData | null
  card?: CardData | null
}

/** Normaliza o endereço validado para o formato do payments (omite complemento vazio). */
function cleanAddress(a: AddressFormInput): Record<string, string> {
  const out: Record<string, string> = {
    street: a.street,
    number: a.number,
    neighborhood: a.neighborhood,
    zipcode: a.zipcode.replace(/\D/g, ''),
    city: a.city,
    state: a.state.toUpperCase(),
  }
  const complement = a.complement?.trim()
  if (complement) out.complement = complement
  return out
}

/** Metadata comum das cobranças (rastreia origem/lead no payments e no recibo). */
function leadMetadata(lead: Lead, sku: string): Record<string, unknown> {
  return { leadId: lead.id, sku, nome: lead.nome, email: lead.email, telefone: lead.telefone }
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
    metadata: leadMetadata(lead, deps.productSku),
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

/**
 * POST /api/checkout/boleto — gera o boleto via gateway (BFF). O boleto exige
 * CPF + endereço (coletados no form) e telefone (do lead). Confirma depois, via
 * webhook (o comprador deixa a página). Idempotência por lead+método.
 */
export async function startBoleto(request: Request, deps: CheckoutDeps): Promise<Response> {
  const leadId = getLeadId(request)
  if (!leadId) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const lead = await deps.repo.getLead(leadId)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  if (!lead.email) return jsonError('Finalize seus dados antes de pagar.', 409, 'NO_CONTACT')
  if (!lead.telefone) return jsonError('Telefone é obrigatório para boleto.', 409, 'NO_CONTACT')

  const parsed = BoletoFormSchema.safeParse(await safeJson(request))
  if (!parsed.success) {
    return json(
      {
        error: { code: 'BAD_REQUEST', message: 'Dados inválidos.' },
        fields: fieldErrors(parsed.error),
      },
      400,
    )
  }
  const form = parsed.data

  const idempotencyKey = `funil-${lead.id}-boleto`
  const input = {
    amountInCents: deps.productPriceCents,
    method: 'BOLETO',
    description: `${deps.productName} (ebook)`,
    customer: {
      name: lead.nome ?? 'Cliente',
      email: lead.email,
      document: form.cpf.replace(/\D/g, ''),
      phone: lead.telefone.replace(/\D/g, ''),
      address: cleanAddress(form.address),
    },
    boleto: { expiresInDays: 3, message: `Pagamento do ebook ${deps.productName}` },
    metadata: leadMetadata(lead, deps.productSku),
  }

  const { status, body } = await deps.gateway.createPayment(input, idempotencyKey)
  if (status !== 201 && status !== 202) {
    return jsonError('Não foi possível gerar o boleto.', 502, 'GATEWAY_ERROR')
  }
  const view = body as PaymentView
  await deps.repo.setPayment(lead.id, view.id)
  await deps.repo.insertEvent(lead.id, 'pagamento_iniciado', 'checkout_boleto')

  return json({ paymentId: view.id, status: view.status, boleto: view.boleto ?? null })
}

/**
 * POST /api/checkout/card — cobra no cartão via gateway (BFF). O cartão chega já
 * TOKENIZADO no browser (PCI: PAN/cvv/validade nunca tocam o servidor). É
 * SÍNCRONO (approved→PAID): se voltar PAID, marca pago e registra o comprador na
 * hora; o webhook continua sendo o backstop durável.
 */
export async function startCard(request: Request, deps: CheckoutDeps): Promise<Response> {
  const leadId = getLeadId(request)
  if (!leadId) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const lead = await deps.repo.getLead(leadId)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  if (!lead.email) return jsonError('Finalize seus dados antes de pagar.', 409, 'NO_CONTACT')
  if (!lead.telefone) return jsonError('Telefone é obrigatório para cartão.', 409, 'NO_CONTACT')

  const parsed = CardChargeSchema.safeParse(await safeJson(request))
  if (!parsed.success) {
    return json(
      {
        error: { code: 'BAD_REQUEST', message: 'Dados inválidos.' },
        fields: fieldErrors(parsed.error),
      },
      400,
    )
  }
  const c = parsed.data

  // Nonce por tentativa → cartão recusado pode re-tentar sem replay da resposta.
  const idempotencyKey = `funil-${lead.id}-card-${c.attemptId}`
  const input = {
    amountInCents: deps.productPriceCents,
    method: 'CREDIT_CARD',
    description: `${deps.productName} (ebook)`,
    customer: {
      name: lead.nome ?? 'Cliente',
      email: lead.email,
      document: c.customer.document.replace(/\D/g, ''),
      phone: lead.telefone.replace(/\D/g, ''),
      address: cleanAddress(c.customer.address),
      birth: c.customer.birth,
    },
    card: { token: c.token, brand: c.brand, last4: c.last4, installments: c.installments },
    metadata: leadMetadata(lead, deps.productSku),
  }

  const { status, body } = await deps.gateway.createPayment(input, idempotencyKey)
  if (status !== 201 && status !== 202) {
    return jsonError('Não foi possível processar o cartão.', 502, 'GATEWAY_ERROR')
  }
  const view = body as PaymentView
  await deps.repo.setPayment(lead.id, view.id)
  await deps.repo.insertEvent(lead.id, 'pagamento_iniciado', 'checkout_card')

  if (view.status === 'PAID') {
    const newlyPaid = await deps.repo.markPaid(lead.id, new Date())
    if (newlyPaid) await deps.repo.insertEvent(lead.id, 'pagamento_confirmado', 'checkout_card')
    await runFulfill(lead.id, deps)
  }

  return json({ paymentId: view.id, status: view.status, card: view.card ?? null })
}

/**
 * Registra o comprador (best-effort): relê o lead já pago e chama `fulfill`. Erros
 * são engolidos de propósito — o webhook re-tenta o registro de forma durável.
 */
async function runFulfill(leadId: string, deps: CheckoutDeps): Promise<void> {
  if (!deps.fulfill) return
  try {
    const fresh = await deps.repo.getLead(leadId)
    if (fresh) await deps.fulfill(fresh)
  } catch {
    /* o webhook é o backstop durável do registro */
  }
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
    await runFulfill(lead.id, deps)
  }

  return json({
    status: view.status,
    paidAt: view.paidAt ?? null,
    pix: view.pix ?? null,
    boleto: view.boleto ?? null,
    card: view.card ?? null,
  })
}
