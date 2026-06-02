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
import { quotePreview, readCouponCode, redeemCouponBestEffort, resolveCharge } from './catalog'

export interface CheckoutDeps {
  repo: FunnelRepo
  gateway: GatewayClient
  /** Slug da oferta ativa no catálogo (fonte do preço autoritativo). */
  offerSlug: string
  productName: string
  productSku: string
  /**
   * Registra o comprador no IdP após o pagamento confirmado. Best-effort nos
   * caminhos de polling/cartão (o webhook é o backstop durável). Opcional para
   * não exigir mudança em chamadas/testes antigos.
   */
  fulfill?: (lead: Lead) => Promise<void>
  /**
   * Concede o acesso na área de membros após o registro. Best-effort nos caminhos
   * de polling/cartão (o webhook é o backstop durável) — roda DEPOIS do `fulfill`
   * (relê o lead p/ o `buyer_user_id` recém-gravado). Idempotente do lado do members.
   */
  grantMembers?: (lead: Lead) => Promise<void>
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

/** Metadata comum das cobranças (rastreia origem/lead/oferta no payments e no recibo). */
function leadMetadata(
  lead: Lead,
  sku: string,
  charge: { offerId: string; couponCode: string | null },
): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    leadId: lead.id,
    sku,
    offerId: charge.offerId,
    nome: lead.nome,
    email: lead.email,
    telefone: lead.telefone,
  }
  if (charge.couponCode) meta.couponCode = charge.couponCode
  return meta
}

/** Persiste o cupom aplicado no lead (p/ registrar o uso na confirmação). */
async function persistCoupon(
  deps: CheckoutDeps,
  leadId: string,
  couponCode: string | null,
): Promise<void> {
  if (couponCode) await deps.repo.updateLead(leadId, { couponCode })
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

  // Preço AUTORITATIVO (catálogo) + cupom opcional do corpo.
  const couponCode = readCouponCode(await safeJson(request))
  const charge = await resolveCharge(deps.gateway, deps.offerSlug, couponCode)
  if (!charge.ok) return jsonError(charge.message, charge.status, charge.code)
  await persistCoupon(deps, lead.id, charge.couponCode)

  // Idempotência determinística por lead → retry aponta p/ a MESMA cobrança Pix.
  const idempotencyKey = `funil-${lead.id}`
  const input = {
    amountInCents: charge.amountInCents,
    method: 'PIX',
    description: `${deps.productName} (ebook)`,
    payerMessage: 'Pagamento do ebook No Comando da IA',
    metadata: leadMetadata(lead, deps.productSku, charge),
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

  const charge = await resolveCharge(deps.gateway, deps.offerSlug, form.couponCode)
  if (!charge.ok) return jsonError(charge.message, charge.status, charge.code)
  await persistCoupon(deps, lead.id, charge.couponCode)

  const idempotencyKey = `funil-${lead.id}-boleto`
  const input = {
    amountInCents: charge.amountInCents,
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
    metadata: leadMetadata(lead, deps.productSku, charge),
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

  const charge = await resolveCharge(deps.gateway, deps.offerSlug, c.couponCode)
  if (!charge.ok) return jsonError(charge.message, charge.status, charge.code)
  await persistCoupon(deps, lead.id, charge.couponCode)

  // Nonce por tentativa → cartão recusado pode re-tentar sem replay da resposta.
  const idempotencyKey = `funil-${lead.id}-card-${c.attemptId}`
  const input = {
    amountInCents: charge.amountInCents,
    method: 'CREDIT_CARD',
    description: `${deps.productName} (ebook)`,
    customer: {
      name: lead.nome ?? 'Cliente',
      email: lead.email,
      document: c.customer.document.replace(/\D/g, ''),
      phone: lead.telefone.replace(/\D/g, ''),
      // Endereço é opcional no cartão (a Efí aceita sem) — só envia se coletado.
      ...(c.customer.address ? { address: cleanAddress(c.customer.address) } : {}),
    },
    card: { token: c.token, brand: c.brand, last4: c.last4, installments: c.installments },
    metadata: leadMetadata(lead, deps.productSku, charge),
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
    if (newlyPaid) {
      await deps.repo.insertEvent(lead.id, 'pagamento_confirmado', 'checkout_card')
      // Cartão é síncrono → registra o uso do cupom só na transição p/ pago (exactly-once).
      await redeemCouponBestEffort(deps.gateway, charge.couponCode)
    }
    await runPostPayment(lead.id, deps)
  }

  return json({ paymentId: view.id, status: view.status, card: view.card ?? null })
}

/**
 * Pós-pagamento (best-effort): registra o comprador e DEPOIS concede o acesso na
 * área de membros. Cada etapa é independente e tem os erros engolidos de propósito
 * — o webhook `payment.paid` é o backstop durável de AMBOS (registro idempotente
 * por e-mail; concessão idempotente pela chave da matrícula). A concessão relê o
 * lead para pegar o `buyer_user_id` que o `fulfill` acabou de gravar.
 */
async function runPostPayment(leadId: string, deps: CheckoutDeps): Promise<void> {
  if (deps.fulfill) {
    try {
      const fresh = await deps.repo.getLead(leadId)
      if (fresh) await deps.fulfill(fresh)
    } catch {
      /* o webhook é o backstop durável do registro */
    }
  }
  if (deps.grantMembers) {
    try {
      const registered = await deps.repo.getLead(leadId)
      if (registered?.buyerUserId) await deps.grantMembers(registered)
    } catch {
      /* o webhook é o backstop durável da concessão */
    }
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
    if (newlyPaid) {
      await deps.repo.insertEvent(lead.id, 'pagamento_confirmado', 'checkout_polling')
      // Registra o uso do cupom só na transição p/ pago (exactly-once via markPaid).
      await redeemCouponBestEffort(deps.gateway, lead.couponCode)
    }
    await runPostPayment(lead.id, deps)
  }

  return json({
    status: view.status,
    paidAt: view.paidAt ?? null,
    pix: view.pix ?? null,
    boleto: view.boleto ?? null,
    card: view.card ?? null,
  })
}

/**
 * POST /api/checkout/quote — valida um cupom contra a oferta ativa e devolve o
 * preço/desconto/total (preview para a UI). Cupom inválido → 200 com `ok:false`
 * + mensagem (a UI mantém o preço cheio). Catálogo fora → 502.
 */
export async function quoteCheckout(
  request: Request,
  deps: Pick<CheckoutDeps, 'gateway' | 'offerSlug'>,
): Promise<Response> {
  const couponCode = readCouponCode(await safeJson(request))
  const result = await quotePreview(deps.gateway, deps.offerSlug, couponCode)
  if ('error' in result) {
    const code = result.status === 409 ? 'OFFER_UNAVAILABLE' : 'CATALOG_ERROR'
    return jsonError(result.error, result.status, code)
  }
  return json(result.preview)
}
