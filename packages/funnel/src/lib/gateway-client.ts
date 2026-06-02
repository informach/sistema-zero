import { signHmac } from '@sistemazero/core/security'

// Cliente do funil → api-gateway (BFF). Assina por HMAC de borda exatamente como
// o gateway espera (mensagem canônica "<ts>.<idempotencyKey>.<corpo>" no POST com
// Idempotency-Key, ou "<ts>.<corpo>" sem ela). O gateway re-assina p/ o payments.
// O funil NUNCA fala com o payments direto.

export interface GatewayClientOptions {
  baseUrl: string
  consumerId: string
  hmacSecret: string
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
}

export interface GatewayResult<T = unknown> {
  status: number
  body: T
}

/** Corpo de `POST /auth/register` (gateway → @sistemazero/auth). */
export interface RegisterBuyerInput {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  source?: string
}

/** Corpo de `POST /members/webhooks/grant` (gateway → @sistemazero/members). */
export interface GrantMembersInput {
  userId: string
  /** Slug ou id da oferta no catálogo (a área de membros resolve o que ela dá direito). */
  offerRef: string
  paymentId: string
  /** ISO-8601 (opcional; a área de membros usa "agora" se ausente). */
  paidAt?: string
  subscription?: { subscriptionId: string; intervalMonths: number | null }
}

async function readBody(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function createGatewayClient(opts: GatewayClientOptions) {
  const doFetch = opts.fetchImpl ?? fetch

  function buildHeaders(rawBody: string, idempotencyKey?: string): Record<string, string> {
    const ts = Math.floor(Date.now() / 1000)
    const message = idempotencyKey ? `${idempotencyKey}.${rawBody}` : rawBody
    const signature = signHmac(opts.hmacSecret, message, ts)
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-consumer-id': opts.consumerId,
      'x-signature': `t=${ts},v1=${signature}`,
    }
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey
    return headers
  }

  return {
    /** POST /payments (via gateway → payments). idempotencyKey determinístico por lead. */
    async createPayment(input: unknown, idempotencyKey: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify(input)
      const res = await doFetch(`${opts.baseUrl}/payments`, {
        method: 'POST',
        headers: buildHeaders(rawBody, idempotencyKey),
        body: rawBody,
      })
      return { status: res.status, body: await readBody(res) }
    },

    /** GET /payments/:id (corpo vazio → assina "<ts>."). */
    async getPayment(paymentId: string): Promise<GatewayResult> {
      const res = await doFetch(`${opts.baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
        headers: buildHeaders(''),
      })
      return { status: res.status, body: await readBody(res) }
    },

    /** GET /catalog/offers/:slug (via gateway → catalog). Rota pública (leitura de marketing). */
    async getOffer(slug: string): Promise<GatewayResult> {
      const res = await doFetch(`${opts.baseUrl}/catalog/offers/${encodeURIComponent(slug)}`, {
        method: 'GET',
        headers: buildHeaders(''),
      })
      return { status: res.status, body: await readBody(res) }
    },

    /** POST /catalog/offers/:slug/quote — preço autoritativo com cupom opcional. Rota pública. */
    async quoteOffer(slug: string, couponCode?: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify(couponCode ? { couponCode } : {})
      const res = await doFetch(
        `${opts.baseUrl}/catalog/offers/${encodeURIComponent(slug)}/quote`,
        {
          method: 'POST',
          headers: buildHeaders(rawBody),
          body: rawBody,
        },
      )
      return { status: res.status, body: await readBody(res) }
    },

    /**
     * POST /catalog/coupons/:code/redeem — registra um uso do cupom (na confirmação do
     * pagamento). A rota exige HMAC de borda do funil (por isso assina o corpo).
     */
    async redeemCoupon(code: string): Promise<GatewayResult> {
      const rawBody = '{}'
      const res = await doFetch(
        `${opts.baseUrl}/catalog/coupons/${encodeURIComponent(code)}/redeem`,
        { method: 'POST', headers: buildHeaders(rawBody), body: rawBody },
      )
      return { status: res.status, body: await readBody(res) }
    },

    /**
     * POST /auth/register (gateway → @sistemazero/auth). Cadastra o comprador
     * como usuário (role `customer`). NÃO assina HMAC de borda: a rota `/auth/*`
     * é pública + passthrough no gateway (o IdP é a autoridade da própria auth;
     * o gateway só roteia + rate-limit por IP). A idempotência por e-mail é do
     * próprio auth: e-mail já cadastrado → 409 (tratado como sucesso pelo chamador).
     */
    async registerBuyer(input: RegisterBuyerInput): Promise<GatewayResult> {
      const res = await doFetch(`${opts.baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      return { status: res.status, body: await readBody(res) }
    },

    /**
     * POST /members/webhooks/grant (gateway → @sistemazero/members). Concede o
     * acesso (matrícula) ao comprador. Assina HMAC de borda (consumer `funnel`); o
     * gateway re-assina como `gateway` e a área de membros verifica. Sem
     * Idempotency-Key — a concessão é idempotente pela chave derivada do pagamento.
     */
    async grantMembersAccess(input: GrantMembersInput): Promise<GatewayResult> {
      const rawBody = JSON.stringify(input)
      const res = await doFetch(`${opts.baseUrl}/members/webhooks/grant`, {
        method: 'POST',
        headers: buildHeaders(rawBody),
        body: rawBody,
      })
      return { status: res.status, body: await readBody(res) }
    },
  }
}

export type GatewayClient = ReturnType<typeof createGatewayClient>
