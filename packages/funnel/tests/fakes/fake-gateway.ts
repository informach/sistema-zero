import type {
  AuthTokens,
  AuthUser,
  GatewayClient,
  GatewayResult,
  RegisterBuyerInput,
  SendMessageInput,
} from '../../src/lib/gateway-client'

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
    ensureBuyer: Array<{ input: RegisterBuyerInput }>
    quote: Array<{ slug: string; couponCode?: string }>
    redeem: string[]
    grant: Array<{ input: unknown }>
    login: Array<{ email: string }>
    logout: string[]
    passwordTokens: string[]
    messages: Array<{ input: SendMessageInput; idempotencyKey: string }>
  }
  /** Tokens válidos do auth falso (use p/ montar os cookies `admin_access`/`admin_refresh`). */
  auth: { access: string; refresh: string; password: string; email: string }
  /** Status HTTP devolvido por grantMembersAccess (default 200). */
  setGrantStatus: (status: number) => void
  setStatus: (status: string) => void
  /** Sobrescreve a resposta de createPayment (default 201 + view do método). */
  setCreateResult: (status: number, body?: unknown) => void
  /** Status HTTP + corpo devolvidos por ensureBuyer (default 201 + `{userId,created:true}`). */
  setEnsureBuyerStatus: (status: number, body?: unknown) => void
  /** Preço da oferta ativa (default 3700). */
  setOfferPrice: (priceCents: number) => void
  /** Cadastra um cupom de desconto FIXO (centavos) reconhecido pelo quote. */
  addCoupon: (code: string, discountCents: number) => void
  /** Sobrescreve o usuário do auth falso (ex.: role `customer` p/ testar 403). */
  setAuthUser: (patch: Partial<AuthUser>) => void
  /** Status devolvido por createPasswordToken (default 201). */
  setPasswordTokenStatus: (status: number) => void
  /** Status devolvido por sendMessage (default 202). */
  setSendMessageStatus: (status: number) => void
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
    ensureBuyer: [],
    quote: [],
    redeem: [],
    grant: [],
    login: [],
    logout: [],
    passwordTokens: [],
    messages: [],
  }
  let ensureBuyerStatus = 201
  let ensureBuyerBody: unknown = { userId: 'user-1', created: true }
  let grantStatus = 200
  let createResult: { status: number; body: unknown } | null = null
  let passwordTokenStatus = 201
  let sendMessageStatus = 202
  let offerPriceCents = 3700
  const coupons = new Map<string, number>() // code (UPPER) → discountCents

  // ── Auth falso (IdP) — login/me/refresh/logout do admin ──────────────────
  const AUTH_PASSWORD = 'segredo'
  const VALID_ACCESS = 'fake-access-token'
  const VALID_REFRESH = 'fake-refresh-token'
  let authUser: AuthUser = {
    id: 'u-admin',
    email: 'admin@sistemazero.dev',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
  }
  const authTokens: AuthTokens = {
    accessToken: VALID_ACCESS,
    refreshToken: VALID_REFRESH,
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresIn: 1_209_600,
  }
  const unauthorized = (): GatewayResult => ({
    status: 401,
    body: { error: { code: 'INVALID_CREDENTIALS', message: 'Não autenticado' } },
  })

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
      if (createResult) return createResult
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
    async ensureBuyer(input): Promise<GatewayResult> {
      calls.ensureBuyer.push({ input })
      return { status: ensureBuyerStatus, body: ensureBuyerBody }
    },
    async grantMembersAccess(input): Promise<GatewayResult> {
      calls.grant.push({ input })
      return { status: grantStatus, body: { ok: true, granted: 1 } }
    },
    async loginAuth(email, password): Promise<GatewayResult> {
      calls.login.push({ email })
      if (email !== authUser.email || password !== AUTH_PASSWORD) return unauthorized()
      return { status: 200, body: { user: authUser, tokens: authTokens } }
    },
    async getMe(accessToken): Promise<GatewayResult> {
      if (accessToken !== VALID_ACCESS) return unauthorized()
      return { status: 200, body: { user: authUser } }
    },
    async refreshAuth(refreshToken): Promise<GatewayResult> {
      if (refreshToken !== VALID_REFRESH) return unauthorized()
      return { status: 200, body: { tokens: authTokens } }
    },
    async logoutAuth(refreshToken): Promise<GatewayResult> {
      calls.logout.push(refreshToken)
      return { status: 200, body: { ok: true } }
    },
    async createPasswordToken(email): Promise<GatewayResult> {
      calls.passwordTokens.push(email)
      if (passwordTokenStatus !== 201) {
        return { status: passwordTokenStatus, body: { error: { code: 'USER_NOT_FOUND' } } }
      }
      return {
        status: 201,
        body: { token: 'fake-pw-token', expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
      }
    },
    async sendMessage(input, idempotencyKey): Promise<GatewayResult> {
      calls.messages.push({ input, idempotencyKey })
      if (sendMessageStatus !== 202) {
        return { status: sendMessageStatus, body: { error: { code: 'PROVIDER_ERROR' } } }
      }
      return { status: 202, body: { messageId: 'msg-1', status: 'QUEUED' } }
    },
  }

  return {
    gateway,
    calls,
    auth: {
      access: VALID_ACCESS,
      refresh: VALID_REFRESH,
      password: AUTH_PASSWORD,
      email: authUser.email,
    },
    setAuthUser: (patch: Partial<AuthUser>) => {
      authUser = { ...authUser, ...patch }
    },
    setStatus: (status: string) => {
      view.status = status
      if (status === 'PAID') view.paidAt = new Date().toISOString()
    },
    setEnsureBuyerStatus: (status: number, body?: unknown) => {
      ensureBuyerStatus = status
      if (body !== undefined) ensureBuyerBody = body
    },
    setGrantStatus: (status: number) => {
      grantStatus = status
    },
    setCreateResult: (status: number, body?: unknown) => {
      createResult = { status, body: body ?? null }
    },
    setOfferPrice: (priceCents: number) => {
      offerPriceCents = priceCents
    },
    addCoupon: (code: string, discountCents: number) => {
      coupons.set(code.toUpperCase(), discountCents)
    },
    setPasswordTokenStatus: (status: number) => {
      passwordTokenStatus = status
    },
    setSendMessageStatus: (status: number) => {
      sendMessageStatus = status
    },
  }
}
