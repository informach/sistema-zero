import type { FunnelRepo, Lead, LeadUpdate } from '../db/repo'
import {
  type AddressFormInput,
  BoletoFormSchema,
  CardChargeSchema,
  type CheckoutContactInput,
  fieldErrors,
  PixChargeSchema,
  pathErrors,
} from '../lib/checkout-schema'
import type { GatewayClient } from '../lib/gateway-client'
import { json, jsonError, safeJson } from '../lib/http'
import { getLeadId } from '../lib/lead-session'
import { quotePreview, readCouponCode, redeemCouponBestEffort, resolveCharge } from './catalog'

/** Oferta resolvida (slug/nome/sku) que o checkout cobra para um dado funil. */
export interface ResolvedOffer {
  offerSlug: string
  productName: string
  productSku: string
}

export interface CheckoutDeps {
  repo: FunnelRepo
  gateway: GatewayClient
  /**
   * Resolve a oferta a cobrar a partir do funil do lead (`leads.funnel`). `null`
   * (lead legado/sem funil) cai no funil default/env. Permite vender mais de um
   * produto sem trocar o handler — o slug do preço autoritativo sai daqui.
   */
  resolveOffer(funnel: string | null): ResolvedOffer
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
  /**
   * Boas-vindas (e-mail + WhatsApp) com o link de definir senha. Best-effort nos
   * caminhos síncronos (cartão/polling), espelhando o webhook — o handler nunca
   * lança e o messaging deduplica por Idempotency-Key, então o replay do webhook
   * NÃO duplica as mensagens.
   */
  sendWelcome?: (lead: Lead) => Promise<void>
  /**
   * Log de diagnóstico (status+code+message do gateway em falha de pagamento —
   * antes o 502 genérico engolia o erro real). Opcional p/ não exigir mudança em
   * chamadas/testes antigos; injetado pela rota (handler permanece puro).
   */
  log?: (msg: string, meta?: Record<string, unknown>) => void
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

/** Extrai o envelope de erro do gateway/payments (`{ error: { code, message } }`). */
function gatewayError(body: unknown): { code?: string; message?: string } {
  const e = (body as { error?: { code?: string; message?: string } } | null)?.error
  return { code: e?.code, message: e?.message }
}

/**
 * Falha na criação do pagamento via gateway: LOGA o erro real (status/code/message
 * — antes era engolido pelo 502 genérico) e distingue a cobrança ainda em
 * processamento (`409 IDEMPOTENCY_IN_FLIGHT` do payments — ex.: retry logo após um
 * timeout da Efí, enquanto a reserva de idempotência não expira) do erro genérico:
 * a UI orienta "aguarde" + re-tenta sozinha em vez de pintar erro.
 */
function paymentCreateError(
  deps: CheckoutDeps,
  ctx: { event: string; leadId: string; waitMessage: string; failMessage: string },
  status: number,
  body: unknown,
): Response {
  const { code, message } = gatewayError(body)
  deps.log?.(ctx.event, { leadId: ctx.leadId, status, code, message })
  if (status === 409 && code === 'IDEMPOTENCY_IN_FLIGHT') {
    return jsonError(ctx.waitMessage, 409, 'PAYMENT_IN_PROGRESS')
  }
  return jsonError(ctx.failMessage, 502, 'GATEWAY_ERROR')
}

/**
 * Persiste o contexto do checkout no lead: a OFERTA vendida (`offerRef`, p/ a
 * concessão de acesso usar a oferta certa em vez do env estático) + o cupom
 * aplicado. Roda nos 3 métodos de pagamento. O cupom é SEMPRE sobrescrito
 * (null limpa): re-cotação sem cupom não pode deixar o cupom velho no lead.
 * (O redeem da confirmação lê o cupom POR COBRANÇA em `lead_payments` — aqui é
 * só o contexto do último checkout, exibição/diagnóstico.)
 */
async function persistCheckoutContext(
  deps: CheckoutDeps,
  leadId: string,
  offerSlug: string,
  couponCode: string | null,
): Promise<void> {
  const set: LeadUpdate = { offerRef: offerSlug, couponCode }
  await deps.repo.updateLead(leadId, set)
}

/**
 * Persiste os "Dados pessoais" do checkout no lead (nome/e-mail/CPF — fonte de
 * verdade do que foi enviado à Efí) e devolve o lead mesclado, para a cobrança
 * e a metadata usarem o contato FRESCO em vez do estado anterior do banco.
 */
async function applyContact(
  deps: CheckoutDeps,
  lead: Lead,
  contact: CheckoutContactInput,
): Promise<Lead> {
  const document = contact.cpf.replace(/\D/g, '')
  await deps.repo.updateLead(lead.id, { nome: contact.nome, email: contact.email, document })
  return { ...lead, nome: contact.nome, email: contact.email, document }
}

/** Resposta 400 com os erros de validação achatados por caminho (`contact.cpf`…). */
function invalidBody(error: Parameters<typeof pathErrors>[0]): Response {
  return json(
    { error: { code: 'BAD_REQUEST', message: 'Dados inválidos.' }, fields: pathErrors(error) },
    400,
  )
}

/**
 * Fingerprint (12 hex) do CONTEÚDO da cobrança Pix p/ compor a Idempotency-Key.
 * O payments rejeita a MESMA chave com payload diferente (409 IDEMPOTENCY_CONFLICT)
 * — antes, mudar cupom/dados pessoais no mesmo lead travava o Pix p/ sempre.
 * Com o fingerprint: payload idêntico → mesma chave → MESMA cobrança (retry não
 * duplica transação); payload diferente → chave nova → cobrança nova (a antiga
 * só expira). Campos: valor + cupom + dados pessoais (o que muda o payload).
 */
export async function pixContentFingerprint(input: {
  amountInCents: number
  couponCode: string | null
  contact: CheckoutContactInput
}): Promise<string> {
  const canonical = [
    input.amountInCents,
    input.couponCode ?? '',
    input.contact.nome,
    input.contact.email,
    input.contact.cpf.replace(/\D/g, ''),
  ].join('|')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return [...new Uint8Array(digest)]
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * POST /api/checkout/pix — cria a cobrança Pix via gateway (BFF) e devolve o QR.
 * O corpo EXIGE os "Dados pessoais" (nome/e-mail/CPF): eles atualizam o lead e
 * viram o `customer` da cobrança (devedor da cob na Efí). O QR só é gerado por
 * clique explícito no checkout (nunca automático).
 */
export async function startPix(request: Request, deps: CheckoutDeps): Promise<Response> {
  const leadId = getLeadId(request)
  if (!leadId) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  let lead = await deps.repo.getLead(leadId)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  // Lead já pago não inicia OUTRA cobrança (a página de checkout cria um lead
  // novo p/ recompra; pelo endpoint direto seria pagar 2x pela mesma entrega).
  if (lead.paidAt) return jsonError('Esta compra já foi confirmada.', 409, 'ALREADY_PAID')

  const parsed = PixChargeSchema.safeParse(await safeJson(request))
  if (!parsed.success) return invalidBody(parsed.error)
  const c = parsed.data
  lead = await applyContact(deps, lead, c.contact)

  // Oferta do FUNIL do lead (slug/nome/sku) — não mais uma oferta global.
  const { offerSlug, productName, productSku } = deps.resolveOffer(lead.funnel)

  // Preço AUTORITATIVO (catálogo) + cupom opcional do corpo.
  const charge = await resolveCharge(deps.gateway, offerSlug, c.couponCode)
  if (!charge.ok) return jsonError(charge.message, charge.status, charge.code)
  await persistCheckoutContext(deps, lead.id, offerSlug, charge.couponCode)

  // Idempotência determinística por lead+CONTEÚDO → retry com os mesmos dados
  // aponta p/ a MESMA cobrança Pix (não duplica transação); dados diferentes
  // (cupom novo, CPF corrigido) geram cobrança nova em vez de 409 CONFLICT.
  const fingerprint = await pixContentFingerprint({
    amountInCents: charge.amountInCents,
    couponCode: charge.couponCode,
    contact: c.contact,
  })
  const idempotencyKey = `funil-${lead.id}-${fingerprint}`
  const input = {
    amountInCents: charge.amountInCents,
    method: 'PIX',
    description: `${productName} (ebook)`,
    payerMessage: `Pagamento do ebook ${productName}`,
    customer: {
      name: c.contact.nome,
      email: c.contact.email,
      document: c.contact.cpf.replace(/\D/g, ''),
      // Telefone vem do pré-checkout (não é coletado de novo aqui); opcional no Pix.
      ...(lead.telefone ? { phone: lead.telefone.replace(/\D/g, '') } : {}),
    },
    metadata: leadMetadata(lead, productSku, charge),
  }

  const { status, body } = await deps.gateway.createPayment(input, idempotencyKey)
  if (status !== 201 && status !== 202) {
    return paymentCreateError(
      deps,
      {
        event: 'checkout.pix.gateway_error',
        leadId: lead.id,
        waitMessage: 'Já estamos gerando seu Pix, aguarde alguns segundos.',
        failMessage: 'Não foi possível criar o pagamento.',
      },
      status,
      body,
    )
  }
  const view = body as PaymentView
  await deps.repo.setPayment(lead.id, view.id, charge.couponCode)
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
  if (lead.paidAt) return jsonError('Esta compra já foi confirmada.', 409, 'ALREADY_PAID')
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

  const { offerSlug, productName, productSku } = deps.resolveOffer(lead.funnel)
  const charge = await resolveCharge(deps.gateway, offerSlug, form.couponCode)
  if (!charge.ok) return jsonError(charge.message, charge.status, charge.code)
  await persistCheckoutContext(deps, lead.id, offerSlug, charge.couponCode)

  const idempotencyKey = `funil-${lead.id}-boleto`
  const input = {
    amountInCents: charge.amountInCents,
    method: 'BOLETO',
    description: `${productName} (ebook)`,
    customer: {
      name: lead.nome ?? 'Cliente',
      email: lead.email,
      document: form.cpf.replace(/\D/g, ''),
      phone: lead.telefone.replace(/\D/g, ''),
      address: cleanAddress(form.address),
    },
    boleto: { expiresInDays: 3, message: `Pagamento do ebook ${productName}` },
    metadata: leadMetadata(lead, productSku, charge),
  }

  const { status, body } = await deps.gateway.createPayment(input, idempotencyKey)
  if (status !== 201 && status !== 202) {
    return paymentCreateError(
      deps,
      {
        event: 'checkout.boleto.gateway_error',
        leadId: lead.id,
        waitMessage: 'Já estamos gerando seu boleto, aguarde alguns segundos.',
        failMessage: 'Não foi possível gerar o boleto.',
      },
      status,
      body,
    )
  }
  const view = body as PaymentView
  await deps.repo.setPayment(lead.id, view.id, charge.couponCode)
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
  let lead = await deps.repo.getLead(leadId)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  if (lead.paidAt) return jsonError('Esta compra já foi confirmada.', 409, 'ALREADY_PAID')
  if (!lead.telefone) return jsonError('Telefone é obrigatório para cartão.', 409, 'NO_CONTACT')
  const phoneDigits = lead.telefone.replace(/\D/g, '')

  const parsed = CardChargeSchema.safeParse(await safeJson(request))
  if (!parsed.success) return invalidBody(parsed.error)
  const c = parsed.data
  lead = await applyContact(deps, lead, c.contact)

  const { offerSlug, productName, productSku } = deps.resolveOffer(lead.funnel)
  const charge = await resolveCharge(deps.gateway, offerSlug, c.couponCode)
  if (!charge.ok) return jsonError(charge.message, charge.status, charge.code)
  await persistCheckoutContext(deps, lead.id, offerSlug, charge.couponCode)

  // Nonce por tentativa → cartão recusado pode re-tentar sem replay da resposta.
  const idempotencyKey = `funil-${lead.id}-card-${c.attemptId}`
  const input = {
    amountInCents: charge.amountInCents,
    method: 'CREDIT_CARD',
    description: `${productName} (ebook)`,
    customer: {
      name: c.contact.nome,
      email: c.contact.email,
      document: c.contact.cpf.replace(/\D/g, ''),
      phone: phoneDigits,
      // Endereço é opcional no cartão (a Efí aceita sem) — só envia se coletado.
      ...(c.address ? { address: cleanAddress(c.address) } : {}),
    },
    card: { token: c.token, brand: c.brand, last4: c.last4, installments: c.installments },
    metadata: leadMetadata(lead, productSku, charge),
  }

  const { status, body } = await deps.gateway.createPayment(input, idempotencyKey)
  if (status !== 201 && status !== 202) {
    return paymentCreateError(
      deps,
      {
        event: 'checkout.card.gateway_error',
        leadId: lead.id,
        waitMessage: 'Seu pagamento já está sendo processado, aguarde alguns segundos.',
        failMessage: 'Não foi possível processar o cartão.',
      },
      status,
      body,
    )
  }
  const view = body as PaymentView
  await deps.repo.setPayment(lead.id, view.id, charge.couponCode)
  await deps.repo.insertEvent(lead.id, 'pagamento_iniciado', 'checkout_card')

  if (view.status === 'PAID') {
    const newlyPaid = await deps.repo.markPaid(lead.id, new Date())
    if (newlyPaid) {
      await deps.repo.insertEvent(lead.id, 'pagamento_confirmado', 'checkout_card')
      // Cartão é síncrono → registra o uso do cupom só na transição p/ pago (exactly-once).
      await redeemCouponBestEffort(deps.gateway, charge.couponCode, view.id, deps.log)
    }
    await runPostPayment(lead.id, deps)
  }

  return json({ paymentId: view.id, status: view.status, card: view.card ?? null })
}

/**
 * Pós-pagamento (best-effort): registra o comprador e DEPOIS concede o acesso na
 * área de membros + boas-vindas. Erros engolidos de propósito — o webhook
 * `payment.paid` é o backstop durável das três etapas (registro idempotente por
 * e-mail; concessão e welcome com one-shot próprio: `members_granted_at` /
 * `welcome_sent_at`). Roda a cada poll com PAID, mas cada etapa se auto-gateia
 * pelos marcadores — poll repetido após tudo concluído custa só leituras locais,
 * ZERO S2S (antes, cada poll re-chamava grant + emitia token novo no auth, o que
 * MATAVA o link de senha já enviado — o auth consome tokens pendentes).
 */
async function runPostPayment(leadId: string, deps: CheckoutDeps): Promise<void> {
  if (!deps.fulfill && !deps.grantMembers && !deps.sendWelcome) return
  try {
    let lead = await deps.repo.getLead(leadId)
    if (!lead) return
    if (deps.fulfill && !lead.buyerRegisteredAt) {
      await deps.fulfill(lead)
      // Relê p/ o `buyer_user_id` que o fulfill acabou de gravar.
      lead = (await deps.repo.getLead(leadId)) ?? lead
    }
    if (lead.buyerUserId) {
      if (deps.grantMembers) await deps.grantMembers(lead)
      // Boas-vindas também no caminho síncrono (simetria com o webhook): se a
      // entrega do webhook falhar de vez, o comprador não fica sem o link de
      // senha. One-shot atômico no handler (claim) — nunca emite token 2×.
      if (deps.sendWelcome) await deps.sendWelcome(lead)
    }
  } catch {
    /* o webhook é o backstop durável do registro, da concessão e das boas-vindas */
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
  if (status !== 200) {
    const { code, message } = gatewayError(body)
    deps.log?.('checkout.status.gateway_error', { leadId: lead.id, status, code, message })
    return jsonError('Falha ao consultar o pagamento.', 502, 'GATEWAY_ERROR')
  }
  const view = body as PaymentView

  if (view.status === 'PAID') {
    const newlyPaid = await deps.repo.markPaid(lead.id, new Date())
    if (newlyPaid) {
      await deps.repo.insertEvent(lead.id, 'pagamento_confirmado', 'checkout_polling')
      // Registra o uso do cupom só na transição p/ pago (exactly-once via
      // markPaid), lendo o cupom DA COBRANÇA PAGA (lead_payments) — o
      // `lead.couponCode` é só o contexto do último checkout e podia estar
      // obsoleto (cupom removido numa re-cotação, cobrança antiga etc.).
      await redeemCouponBestEffort(
        deps.gateway,
        await deps.repo.couponForPayment(paymentId),
        paymentId,
        deps.log,
      )
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
  deps: Pick<CheckoutDeps, 'gateway' | 'repo' | 'resolveOffer'>,
): Promise<Response> {
  const couponCode = readCouponCode(await safeJson(request))
  // A oferta a cotar vem do FUNIL do lead (cookie); sem lead → funil default.
  const leadId = getLeadId(request)
  const lead = leadId ? await deps.repo.getLead(leadId) : null
  const { offerSlug } = deps.resolveOffer(lead?.funnel ?? null)
  const result = await quotePreview(deps.gateway, offerSlug, couponCode)
  if ('error' in result) {
    const code = result.status === 409 ? 'OFFER_UNAVAILABLE' : 'CATALOG_ERROR'
    return jsonError(result.error, result.status, code)
  }
  return json(result.preview)
}
