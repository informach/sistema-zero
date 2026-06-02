import { fetchWithTimeout, responseToEfiError, withRetry } from './http'

export interface EfiCobrancasClientConfig {
  clientId: string
  clientSecret: string
  sandbox: boolean
  /** Tentativas extras em erros transitórios (429/5xx/rede). Padrão 3. */
  maxRetries?: number
  /** Atraso base do backoff exponencial, em ms. Padrão 200. */
  retryBaseMs?: number
  /** Timeout por requisição HTTP, em ms. Padrão 15s. */
  requestTimeoutMs?: number
}

/**
 * Cliente HTTP nativo (Bun `fetch`) para a API **"Cobranças"** (boleto) da Efí.
 *
 * DIFERENTE da API Pix: outra base URL (`cobrancas[-h].api.efipay.com.br/v1`),
 * autenticação em `POST /authorize` (HTTP Basic) e — crucialmente — **SEM
 * mTLS/certificado**. Este arquivo NÃO declara `tls` em lugar nenhum nem importa
 * `certificate.ts`: o boleto jamais carrega o certificado do Pix.
 */
export class EfiCobrancasClient {
  private readonly baseUrl: string
  private readonly maxRetries: number
  private readonly retryBaseMs: number
  private readonly requestTimeoutMs: number
  private token: { value: string; expiresAt: number } | null = null
  private authInFlight: Promise<string> | null = null

  constructor(private readonly config: EfiCobrancasClientConfig) {
    this.baseUrl = config.sandbox
      ? 'https://cobrancas-h.api.efipay.com.br/v1'
      : 'https://cobrancas.api.efipay.com.br/v1'
    this.maxRetries = config.maxRetries ?? 3
    this.retryBaseMs = config.retryBaseMs ?? 200
    this.requestTimeoutMs = config.requestTimeoutMs ?? 15_000
  }

  /** Pré-aquece o token OAuth (cartão/boleto via API Cobranças). Ver `EfiClient.warmUp`. */
  async warmUp(): Promise<void> {
    await this.authorize()
  }

  private async authorize(): Promise<string> {
    const now = Date.now()
    if (this.token && this.token.expiresAt > now + 30_000) return this.token.value

    // Single-flight: requests concorrentes compartilham a mesma busca de token.
    if (this.authInFlight) return this.authInFlight
    this.authInFlight = this.fetchToken().finally(() => {
      this.authInFlight = null
    })
    return this.authInFlight
  }

  private async fetchToken(): Promise<string> {
    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64',
    )
    const json = await withRetry(
      'autenticação cobranças',
      true,
      { maxRetries: this.maxRetries, baseMs: this.retryBaseMs },
      async () => {
        const res = await fetchWithTimeout(
          `${this.baseUrl}/authorize`,
          {
            method: 'POST',
            headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ grant_type: 'client_credentials' }),
          },
          this.requestTimeoutMs,
        )
        if (!res.ok) throw await responseToEfiError(res, 'autenticação cobranças')
        return (await res.json()) as { access_token: string; expires_in?: number }
      },
    )
    // Token da API Cobranças vive ~600s (vs 3600s do Pix).
    this.token = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 600) * 1000,
    }
    return this.token.value
  }

  /**
   * @param idempotent quando `false` (ex.: `POST /charge/one-step`, que gera um
   * `charge_id` no servidor) a chamada NÃO é repetida em erro transitório —
   * evita emitir um segundo boleto quando a resposta se perde após a criação.
   */
  private async request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; idempotent?: boolean } = {},
  ): Promise<T> {
    const idempotent = opts.idempotent ?? method !== 'POST'
    return withRetry(
      `${method} ${path}`,
      idempotent,
      { maxRetries: this.maxRetries, baseMs: this.retryBaseMs },
      async () => {
        const buildInit = (token: string): RequestInit => ({
          method,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        })

        let res = await fetchWithTimeout(
          `${this.baseUrl}${path}`,
          buildInit(await this.authorize()),
          this.requestTimeoutMs,
        )
        if (res.status === 401) {
          this.token = null
          res = await fetchWithTimeout(
            `${this.baseUrl}${path}`,
            buildInit(await this.authorize()),
            this.requestTimeoutMs,
          )
        }
        if (!res.ok) throw await responseToEfiError(res, `${method} ${path}`)
        if (res.status === 204) return undefined as T
        return (await res.json()) as T
      },
    )
  }

  // ── Endpoints Cobranças ───────────────────────────────────────────────────

  /** `POST /charge/one-step` — cria o boleto. NÃO idempotente (charge_id gerado pela Efí). */
  createOneStepCharge(body: Record<string, unknown>): Promise<any> {
    return this.request('POST', '/charge/one-step', { body, idempotent: false })
  }

  detailCharge(chargeId: number | string): Promise<any> {
    return this.request('GET', `/charge/${chargeId}`)
  }

  cancelCharge(chargeId: number | string): Promise<any> {
    return this.request('PUT', `/charge/${chargeId}/cancel`, { idempotent: true })
  }

  /** A Efí POSTa um TOKEN ao `notification_url`; aqui buscamos o histórico de status. */
  getNotification(token: string): Promise<any> {
    return this.request('GET', `/notification/${token}`)
  }

  // ── Assinaturas (recorrência) ─────────────────────────────────────────────
  // Rotas conforme o SDK oficial `sdk-node-apis-efi` (endpoints Cobranças).
  // Confirme os nomes de campo da resposta no sandbox via `bun run subscription:create`.

  /** `POST /plan` — cria um plano de recorrência. NÃO idempotente (plan_id gerado pela Efí). */
  createPlan(body: Record<string, unknown>): Promise<any> {
    return this.request('POST', '/plan', { body, idempotent: false })
  }

  /**
   * `POST /plan/:planId/subscription/one-step` — cria a assinatura + 1ª cobrança.
   * NÃO idempotente (subscription_id gerado pela Efí) → o POST nunca é re-tentado.
   */
  createOneStepSubscription(planId: number | string, body: Record<string, unknown>): Promise<any> {
    return this.request('POST', `/plan/${planId}/subscription/one-step`, {
      body,
      idempotent: false,
    })
  }

  detailSubscription(subscriptionId: number | string): Promise<any> {
    return this.request('GET', `/subscription/${subscriptionId}`)
  }

  cancelSubscription(subscriptionId: number | string): Promise<any> {
    return this.request('PUT', `/subscription/${subscriptionId}/cancel`, { idempotent: true })
  }
}
