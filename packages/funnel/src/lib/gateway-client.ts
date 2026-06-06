import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'

// Cliente do funil → api-gateway (BFF). Assina por HMAC de borda exatamente como
// o gateway espera (mensagem canônica "<ts>.<MÉTODO>.<path>.<idempotencyKey>.<corpo>"
// no POST com Idempotency-Key, ou "<ts>.<MÉTODO>.<path>.<corpo>" sem ela — o
// método+path amarrados impedem replay cross-endpoint). O gateway re-assina p/ o
// payments. O funil NUNCA fala com o payments direto.

export interface GatewayClientOptions {
  baseUrl: string
  consumerId: string
  hmacSecret: string
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
  /** Timeout (ms) das chamadas em geral (leituras + S2S rápidos). Default 10s. */
  timeoutMs?: number
  /**
   * Timeout (ms) da CRIAÇÃO de pagamento. Default 40s: a Efí fria leva ~15-16s
   * (mTLS/OAuth) e o gateway segura a conexão por até 45s (idleTimeout) — um
   * teto menor abortaria cobrança que ainda ia completar.
   */
  paymentTimeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000
const PAYMENT_CREATE_TIMEOUT_MS = 40_000

export interface GatewayResult<T = unknown> {
  status: number
  body: T
}

/** Corpo de `POST /auth/internal/ensure-buyer` (gateway → @sistemazero/auth). */
export interface RegisterBuyerInput {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  source?: string
}

/**
 * Resposta de `POST /auth/internal/ensure-buyer`. SEMPRE traz o `userId` (novo OU
 * existente). `created` distingue o comprador NOVO (recebe o e-mail de boas-vindas)
 * do RECORRENTE (já tem credenciais).
 */
export interface EnsureBuyerResult {
  userId: string
  created: boolean
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
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const paymentTimeoutMs = opts.paymentTimeoutMs ?? PAYMENT_CREATE_TIMEOUT_MS

  /**
   * fetch com TIMEOUT que NUNCA lança: timeout → 504 GATEWAY_TIMEOUT; rede/DNS
   * fora → 502 GATEWAY_UNREACHABLE. Os chamadores já tratam por status (retry/
   * best-effort) — sem isto, um gateway pendurado segurava o handler (e o SSR
   * do checkout) para sempre, e uma exceção de rede virava 500 opaco.
   * ⚠️ AbortController + clearTimeout (NÃO `AbortSignal.timeout`): o signal de
   * fábrica não é cancelável — cada chamada deixaria um timer de 10-40s vivo
   * após a resposta (acúmulo em produção; e o bun test fica esperando os
   * timers pendentes drenarem — a suíte inteira pendurava).
   */
  async function requestJson(url: string, init: RequestInit, ms: number): Promise<GatewayResult> {
    const controller = new AbortController()
    // Timer REFERENCIADO de propósito (sem unref): garante que o abort dispara
    // mesmo quando só a promise do fetch segura o loop. O clearTimeout no
    // finally evita acúmulo no caminho feliz.
    const timer = setTimeout(
      () => controller.abort(new DOMException('gateway timeout', 'TimeoutError')),
      ms,
    )
    try {
      const res = await doFetch(url, { ...init, signal: controller.signal })
      return { status: res.status, body: await readBody(res) }
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError'
      return {
        status: timedOut ? 504 : 502,
        body: {
          error: {
            code: timedOut ? 'GATEWAY_TIMEOUT' : 'GATEWAY_UNREACHABLE',
            message: err instanceof Error ? err.message : String(err),
          },
        },
      }
    } finally {
      clearTimeout(timer)
    }
  }

  function buildHeaders(
    method: string,
    path: string,
    rawBody: string,
    idempotencyKey?: string,
  ): Record<string, string> {
    const ts = Math.floor(Date.now() / 1000)
    // O path assinado é o MESMO usado na URL (pathname, sem query) — o gateway
    // verifica com o pathname que recebe na requisição.
    const message = canonicalHmacMessage({ method, path, idempotencyKey, body: rawBody })
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
      const path = '/payments'
      return requestJson(
        `${opts.baseUrl}${path}`,
        {
          method: 'POST',
          headers: buildHeaders('POST', path, rawBody, idempotencyKey),
          body: rawBody,
        },
        paymentTimeoutMs,
      )
    },

    /** GET /payments/:id (corpo vazio → assina "<ts>.GET.<path>."). */
    async getPayment(paymentId: string): Promise<GatewayResult> {
      const path = `/payments/${encodeURIComponent(paymentId)}`
      return requestJson(
        `${opts.baseUrl}${path}`,
        { method: 'GET', headers: buildHeaders('GET', path, '') },
        timeoutMs,
      )
    },

    /** GET /catalog/offers/:slug (via gateway → catalog). Rota pública (leitura de marketing). */
    async getOffer(slug: string): Promise<GatewayResult> {
      const path = `/catalog/offers/${encodeURIComponent(slug)}`
      return requestJson(
        `${opts.baseUrl}${path}`,
        { method: 'GET', headers: buildHeaders('GET', path, '') },
        timeoutMs,
      )
    },

    /** POST /catalog/offers/:slug/quote — preço autoritativo com cupom opcional. Rota pública. */
    async quoteOffer(slug: string, couponCode?: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify(couponCode ? { couponCode } : {})
      const path = `/catalog/offers/${encodeURIComponent(slug)}/quote`
      return requestJson(
        `${opts.baseUrl}${path}`,
        { method: 'POST', headers: buildHeaders('POST', path, rawBody), body: rawBody },
        timeoutMs,
      )
    },

    /**
     * POST /catalog/coupons/:code/redeem — registra um uso do cupom (na confirmação do
     * pagamento). A rota exige HMAC de borda do funil (por isso assina o corpo).
     */
    async redeemCoupon(code: string): Promise<GatewayResult> {
      const rawBody = '{}'
      const path = `/catalog/coupons/${encodeURIComponent(code)}/redeem`
      return requestJson(
        `${opts.baseUrl}${path}`,
        { method: 'POST', headers: buildHeaders('POST', path, rawBody), body: rawBody },
        timeoutMs,
      )
    },

    /**
     * POST /auth/internal/ensure-buyer (gateway → @sistemazero/auth). Garante o
     * usuário do comprador (cria se novo, reaproveita se já existe) e SEMPRE devolve
     * o `userId` — é o que destrava a concessão de acesso ao comprador RECORRENTE
     * (que antes recebia 409 no `register` e ficava sem `userId`). Rota interna S2S:
     * assina HMAC de borda (consumer `funnel`); o gateway injeta o token interno do
     * auth. 201 quando criou, 200 quando reaproveitou. Idempotente por e-mail.
     */
    async ensureBuyer(input: RegisterBuyerInput): Promise<GatewayResult> {
      const rawBody = JSON.stringify(input)
      const path = '/auth/internal/ensure-buyer'
      return requestJson(
        `${opts.baseUrl}${path}`,
        { method: 'POST', headers: buildHeaders('POST', path, rawBody), body: rawBody },
        timeoutMs,
      )
    },

    /**
     * Login do ADMIN no IdP (`POST /auth/login` → `{ user, tokens }`). Rota pública
     * + passthrough no gateway (sem HMAC de borda — o IdP é a autoridade). O funil
     * guarda os tokens em cookies HttpOnly e valida via `getMe`.
     */
    async loginAuth(email: string, password: string): Promise<GatewayResult> {
      return requestJson(
        `${opts.baseUrl}/auth/login`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
        timeoutMs,
      )
    },

    /** `GET /auth/me` com Bearer — valida o access token e devolve `{ user }` (ou 401). */
    async getMe(accessToken: string): Promise<GatewayResult> {
      return requestJson(
        `${opts.baseUrl}/auth/me`,
        { method: 'GET', headers: { authorization: `Bearer ${accessToken}` } },
        timeoutMs,
      )
    },

    /** `POST /auth/refresh` → `{ tokens }` (rotação no auth). 401 se o refresh não vale. */
    async refreshAuth(refreshToken: string): Promise<GatewayResult> {
      return requestJson(
        `${opts.baseUrl}/auth/refresh`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        },
        timeoutMs,
      )
    },

    /** `POST /auth/logout` — revoga o refresh token (encerra a sessão no auth). */
    async logoutAuth(refreshToken: string): Promise<GatewayResult> {
      return requestJson(
        `${opts.baseUrl}/auth/logout`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        },
        timeoutMs,
      )
    },

    /**
     * POST /members/webhooks/grant (gateway → @sistemazero/members). Concede o
     * acesso (matrícula) ao comprador. Assina HMAC de borda (consumer `funnel`); o
     * gateway re-assina como `gateway` e a área de membros verifica. Sem
     * Idempotency-Key — a concessão é idempotente pela chave derivada do pagamento.
     */
    async grantMembersAccess(input: GrantMembersInput): Promise<GatewayResult> {
      const rawBody = JSON.stringify(input)
      const path = '/members/webhooks/grant'
      return requestJson(
        `${opts.baseUrl}${path}`,
        { method: 'POST', headers: buildHeaders('POST', path, rawBody), body: rawBody },
        timeoutMs,
      )
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
      const path = '/auth/internal/password-tokens'
      return requestJson(
        `${opts.baseUrl}${path}`,
        { method: 'POST', headers: buildHeaders('POST', path, rawBody), body: rawBody },
        timeoutMs,
      )
    },

    /**
     * POST /messaging/send (gateway → @sistemazero/messaging). Enfileira um envio
     * transacional (202). HMAC de borda + `Idempotency-Key` (o messaging deduplica
     * por consumer+chave → reentrega de webhook NÃO duplica o e-mail).
     */
    async sendMessage(input: SendMessageInput, idempotencyKey: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify(input)
      const path = '/messaging/send'
      return requestJson(
        `${opts.baseUrl}${path}`,
        {
          method: 'POST',
          headers: buildHeaders('POST', path, rawBody, idempotencyKey),
          body: rawBody,
        },
        timeoutMs,
      )
    },
  }
}

export type GatewayClient = ReturnType<typeof createGatewayClient>
