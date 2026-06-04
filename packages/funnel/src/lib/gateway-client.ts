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

/** Usuário retornado pelo auth (`/auth/login` e `/auth/me`). Sem `passwordHash`. */
export interface AuthUser {
  id?: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone?: string
}

/** Tokens emitidos pelo auth (access JWT + refresh opaco). */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  refreshExpiresIn: number
}

/** Resposta de `POST /auth/internal/password-tokens` (token de 1º acesso). */
export interface PasswordTokenResult {
  token: string
  expiresAt: string
}

/** Corpo de `POST /messaging/send` (gateway → @sistemazero/messaging). */
export interface SendMessageInput {
  channel: 'email' | 'whatsapp'
  templateKey: string
  recipient: { name: string; email?: string; phone?: string }
  variables?: Record<string, string>
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
     * Login do ADMIN no IdP (`POST /auth/login` → `{ user, tokens }`). Rota pública
     * + passthrough no gateway (sem HMAC de borda — o IdP é a autoridade). O funil
     * guarda os tokens em cookies HttpOnly e valida via `getMe`.
     */
    async loginAuth(email: string, password: string): Promise<GatewayResult> {
      const res = await doFetch(`${opts.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      return { status: res.status, body: await readBody(res) }
    },

    /** `GET /auth/me` com Bearer — valida o access token e devolve `{ user }` (ou 401). */
    async getMe(accessToken: string): Promise<GatewayResult> {
      const res = await doFetch(`${opts.baseUrl}/auth/me`, {
        method: 'GET',
        headers: { authorization: `Bearer ${accessToken}` },
      })
      return { status: res.status, body: await readBody(res) }
    },

    /** `POST /auth/refresh` → `{ tokens }` (rotação no auth). 401 se o refresh não vale. */
    async refreshAuth(refreshToken: string): Promise<GatewayResult> {
      const res = await doFetch(`${opts.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      return { status: res.status, body: await readBody(res) }
    },

    /** `POST /auth/logout` — revoga o refresh token (encerra a sessão no auth). */
    async logoutAuth(refreshToken: string): Promise<GatewayResult> {
      const res = await doFetch(`${opts.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
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

    /**
     * POST /auth/internal/password-tokens (gateway → @sistemazero/auth). Emite o
     * token de DEFINIÇÃO de senha do 1º acesso pós-compra (o funil monta o link
     * `${COMMUNITY_URL}/redefinir-senha?token=...` e envia o e-mail de boas-vindas).
     * HMAC de borda (consumer `funnel`); o gateway injeta o token interno do auth.
     * O token cru só trafega S2S — nunca é persistido no funil.
     */
    async createPasswordToken(email: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify({ email })
      const res = await doFetch(`${opts.baseUrl}/auth/internal/password-tokens`, {
        method: 'POST',
        headers: buildHeaders(rawBody),
        body: rawBody,
      })
      return { status: res.status, body: await readBody(res) }
    },

    /**
     * POST /messaging/send (gateway → @sistemazero/messaging). Enfileira um envio
     * transacional (202). HMAC de borda + `Idempotency-Key` (o messaging deduplica
     * por consumer+chave → reentrega de webhook NÃO duplica o e-mail).
     */
    async sendMessage(input: SendMessageInput, idempotencyKey: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify(input)
      const res = await doFetch(`${opts.baseUrl}/messaging/send`, {
        method: 'POST',
        headers: buildHeaders(rawBody, idempotencyKey),
        body: rawBody,
      })
      return { status: res.status, body: await readBody(res) }
    },
  }
}

export type GatewayClient = ReturnType<typeof createGatewayClient>
