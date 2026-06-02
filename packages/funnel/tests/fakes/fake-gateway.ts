import type { GatewayClient, GatewayResult, RegisterBuyerInput } from '../../src/lib/gateway-client'

interface FakePix {
  txid: string
  copiaECola: string
  imagemQrcodeBase64?: string
  expiresAt: string | null
}
interface FakeBoleto {
  barcode: string
  digitableLine: string
  pdfUrl: string
  expiresAt: string | null
}
interface FakeCard {
  brand: string
  last4: string
  installments: number
}

export interface FakeGatewayState {
  gateway: GatewayClient
  calls: {
    create: Array<{ input: unknown; idempotencyKey: string }>
    get: string[]
    register: Array<{ input: RegisterBuyerInput }>
    quote: Array<{ slug: string; couponCode?: string }>
    redeem: string[]
    grant: Array<{ input: unknown }>
  }
  /** Status HTTP devolvido por grantMembersAccess (default 200). */
  setGrantStatus: (status: number) => void
  setStatus: (status: string) => void
  /** Status HTTP devolvido por registerBuyer (default 201). */
  setRegisterStatus: (status: number, body?: unknown) => void
  /** Preço da oferta ativa (default 3700). */
  setOfferPrice: (priceCents: number) => void
  /** Cadastra um cupom de desconto FIXO (centavos) reconhecido pelo quote. */
  addCoupon: (code: string, discountCents: number) => void
}

/** Gateway falso em memória (não verifica HMAC; usado nos testes de checkout). */
export function createFakeGateway(): FakeGatewayState {
  const pix: FakePix = {
    txid: 'TX123',
    copiaECola: '00020126...br.gov.bcb.pix...6304ABCD',
    imagemQrcodeBase64: 'iVBORw0KGgo=',
    expiresAt: null,
  }
  const boleto: FakeBoleto = {
    barcode: '34191790010104351004791020150008291070026000',
    digitableLine: '34191.79001 01043.510047 91020.150008 2 91070026000',
    pdfUrl: 'https://efi.example/boleto/pay-1.pdf',
    expiresAt: null,
  }
  const card: FakeCard = { brand: 'visa', last4: '0087', installments: 1 }

  const view = { id: 'pay-1', status: 'PENDING', paidAt: null as string | null }
  const calls: FakeGatewayState['calls'] = {
    create: [],
    get: [],
    register: [],
    quote: [],
    redeem: [],
    grant: [],
  }
  let registerStatus = 201
  let registerBody: unknown = { user: { id: 'user-1' } }
  let grantStatus = 200
  let offerPriceCents = 3700
  const coupons = new Map<string, number>() // code (UPPER) → discountCents

  function bodyForMethod(method: string): Record<string, unknown> {
    const base: Record<string, unknown> = { id: view.id, status: view.status, paidAt: view.paidAt }
    if (method === 'BOLETO') base.boleto = boleto
    else if (method === 'CREDIT_CARD') base.card = card
    else base.pix = pix
    return base
  }

  const gateway: GatewayClient = {
    async createPayment(input, idempotencyKey): Promise<GatewayResult> {
      calls.create.push({ input, idempotencyKey })
      const method = (input as { method?: string }).method ?? 'PIX'
      return { status: 201, body: bodyForMethod(method) }
    },
    async getPayment(paymentId): Promise<GatewayResult> {
      calls.get.push(paymentId)
      return {
        status: 200,
        body: { id: view.id, status: view.status, paidAt: view.paidAt, pix, boleto, card },
      }
    },
    async getOffer(slug): Promise<GatewayResult> {
      return {
        status: 200,
        body: {
          id: 'offer-1',
          slug,
          name: 'Oferta padrão',
          priceCents: offerPriceCents,
          compareAtPriceCents: null,
          currency: 'BRL',
          guaranteeDays: 7,
          installmentsMax: 12,
          product: { name: 'No Comando da IA', sku: 'no-comando-da-ia' },
          includes: [{ name: 'No Comando da IA', isPrimary: true }],
        },
      }
    },
    async quoteOffer(slug, couponCode): Promise<GatewayResult> {
      calls.quote.push({ slug, couponCode })
      const base = {
        offerId: 'offer-1',
        offerSlug: slug,
        currency: 'BRL',
        priceCents: offerPriceCents,
      }
      if (!couponCode) {
        return {
          status: 200,
          body: { ...base, discountCents: 0, finalPriceCents: offerPriceCents, coupon: null },
        }
      }
      const code = couponCode.toUpperCase()
      const discountCents = coupons.get(code)
      if (discountCents === undefined) {
        return {
          status: 404,
          body: { error: { code: 'COUPON_NOT_FOUND', message: 'Cupom inválido' } },
        }
      }
      const discount = Math.min(discountCents, offerPriceCents)
      return {
        status: 200,
        body: {
          ...base,
          discountCents: discount,
          finalPriceCents: offerPriceCents - discount,
          coupon: { code, type: 'fixed', percentOff: null, amountOffCents: discountCents },
        },
      }
    },
    async redeemCoupon(code): Promise<GatewayResult> {
      calls.redeem.push(code)
      return { status: 200, body: { ok: true } }
    },
    async registerBuyer(input): Promise<GatewayResult> {
      calls.register.push({ input })
      return { status: registerStatus, body: registerBody }
    },
    async grantMembersAccess(input): Promise<GatewayResult> {
      calls.grant.push({ input })
      return { status: grantStatus, body: { ok: true, granted: 1 } }
    },
  }

  return {
    gateway,
    calls,
    setStatus: (status: string) => {
      view.status = status
      if (status === 'PAID') view.paidAt = new Date().toISOString()
    },
    setRegisterStatus: (status: number, body?: unknown) => {
      registerStatus = status
      if (body !== undefined) registerBody = body
    },
    setGrantStatus: (status: number) => {
      grantStatus = status
    },
    setOfferPrice: (priceCents: number) => {
      offerPriceCents = priceCents
    },
    addCoupon: (code: string, discountCents: number) => {
      coupons.set(code.toUpperCase(), discountCents)
    },
  }
}
