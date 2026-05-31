import { EfiGatewayError } from './efi.errors'

/** `RequestInit` + a extensão `tls` do Bun (certificado de cliente para mTLS). */
interface BunFetchInit extends RequestInit {
  tls?: { cert: string; key: string }
}

export interface EfiClientConfig {
  clientId: string
  clientSecret: string
  /** Certificado (PEM) e chave (PEM) — ver `loadEfiCertificate`. */
  cert: string
  key: string
  sandbox: boolean
  /** Tentativas extras em erros transitórios (429/5xx/rede). Padrão 3. */
  maxRetries?: number
  /** Atraso base do backoff exponencial, em ms. Padrão 200. */
  retryBaseMs?: number
  /** Timeout por requisição HTTP, em ms (aborta sockets pendurados). Padrão 15s. */
  requestTimeoutMs?: number
}

/**
 * Cliente HTTP nativo (Bun `fetch` + mTLS via PEM) para a API Pix da Efí.
 * Substitui o SDK oficial, que não funciona sob o Bun.
 *
 * Resiliência para picos: token OAuth com cache + **single-flight** (uma única
 * busca de token mesmo sob concorrência), **retry com backoff exponencial** em
 * 429/5xx/erros de rede **apenas para chamadas idempotentes** (GET/PUT/token), e
 * **timeout por requisição** (aborta sockets pendurados — o modo de falha típico
 * do mTLS sob Bun).
 */
export class EfiClient {
  private readonly baseUrl: string
  private readonly tls: { cert: string; key: string }
  private readonly maxRetries: number
  private readonly retryBaseMs: number
  private readonly requestTimeoutMs: number
  private token: { value: string; expiresAt: number } | null = null
  private authInFlight: Promise<string> | null = null

  constructor(private readonly config: EfiClientConfig) {
    this.baseUrl = config.sandbox
      ? 'https://pix-h.api.efipay.com.br'
      : 'https://pix.api.efipay.com.br'
    this.tls = { cert: config.cert, key: config.key }
    this.maxRetries = config.maxRetries ?? 3
    this.retryBaseMs = config.retryBaseMs ?? 200
    this.requestTimeoutMs = config.requestTimeoutMs ?? 15_000
  }

  private async authorize(): Promise<string> {
    const now = Date.now()
    if (this.token && this.token.expiresAt > now + 60_000) return this.token.value

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
    // A autenticação (client_credentials) é idempotente → pode ser repetida com segurança.
    const json = await this.withRetry('autenticação', true, async () => {
      const init: BunFetchInit = {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'client_credentials' }),
        tls: this.tls,
      }
      const res = await this.fetchWithTimeout(`${this.baseUrl}/oauth/token`, init)
      if (!res.ok) throw await this.toError(res, 'autenticação')
      return (await res.json()) as { access_token: string; expires_in?: number }
    })
    this.token = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    }
    return this.token.value
  }

  /**
   * @param idempotent quando `false` (ex.: POST que cria recurso com id gerado
   * pelo servidor) a chamada NÃO é repetida em erro transitório — evitar criar
   * recursos duplicados quando a resposta se perde após o efeito já ter ocorrido.
   */
  private async request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; headers?: Record<string, string>; idempotent?: boolean } = {},
  ): Promise<T> {
    const idempotent = opts.idempotent ?? method !== 'POST'
    return this.withRetry(`${method} ${path}`, idempotent, async () => {
      const buildInit = (token: string): BunFetchInit => ({
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(opts.headers ?? {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        tls: this.tls,
      })

      let res = await this.fetchWithTimeout(
        `${this.baseUrl}${path}`,
        buildInit(await this.authorize()),
      )
      // Token revogado/expirado fora da janela de skew → reautentica uma vez.
      if (res.status === 401) {
        this.token = null
        res = await this.fetchWithTimeout(
          `${this.baseUrl}${path}`,
          buildInit(await this.authorize()),
        )
      }
      if (!res.ok) throw await this.toError(res, `${method} ${path}`)
      if (res.status === 204) return undefined as T
      return (await res.json()) as T
    })
  }

  /** `fetch` com timeout via `AbortController` — impede sockets pendurados de travar o caller. */
  private async fetchWithTimeout(url: string, init: BunFetchInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  /** Executa `fn` com retry+backoff exponencial (com jitter) em erros transitórios. */
  private async withRetry<T>(
    context: string,
    idempotent: boolean,
    fn: () => Promise<T>,
  ): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        // Não repetir chamadas não-idempotentes: a 1ª pode ter tido efeito mesmo
        // com resposta perdida (ex.: cobrança/chave criada → duplicaria).
        if (!idempotent || attempt === this.maxRetries || !this.isRetryable(error)) break
        const delay =
          Math.min(this.retryBaseMs * 2 ** attempt, 2000) + Math.floor(Math.random() * 100)
        await Bun.sleep(delay)
      }
    }
    if (lastError instanceof EfiGatewayError) throw lastError
    throw new EfiGatewayError(
      `Efí [${context}]: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      undefined,
      lastError,
    )
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof EfiGatewayError) {
      return error.status === 429 || (error.status !== undefined && error.status >= 500)
    }
    // Erro de rede (ECONNRESET, timeout/abort, etc.) → vale tentar de novo.
    return true
  }

  private async toError(res: Response, context: string): Promise<EfiGatewayError> {
    let detail: Record<string, unknown> | undefined
    try {
      detail = (await res.json()) as Record<string, unknown>
    } catch {
      detail = undefined
    }
    const d = detail ?? {}
    const message = String(
      d.mensagem ?? d.detail ?? d.error_description ?? d.title ?? d.nome ?? `HTTP ${res.status}`,
    )
    const code = d.nome ?? d.error ?? d.type
    return new EfiGatewayError(
      `Efí [${context}]: ${message}`,
      code != null ? String(code) : String(res.status),
      detail,
      res.status,
    )
  }

  // ── Endpoints Pix usados pelo serviço ─────────────────────────────────────

  /**
   * Cria/atualiza uma cobrança imediata com `txid` determinístico via
   * `PUT /v2/cob/{txid}`. Diferente do `POST /v2/cob` (txid gerado pelo
   * servidor), o PUT é **idempotente**: re-enviar o mesmo txid não cria uma
   * segunda cobrança — fechando a janela de cobrança duplicada em retries.
   */
  createCharge(txid: string, body: Record<string, unknown>): Promise<any> {
    return this.request('PUT', `/v2/cob/${txid}`, { body, idempotent: true })
  }

  detailCharge(txid: string): Promise<any> {
    return this.request('GET', `/v2/cob/${txid}`)
  }

  generateQrCode(locationId: number | string): Promise<any> {
    return this.request('GET', `/v2/loc/${locationId}/qrcode`)
  }

  configWebhook(
    chave: string,
    webhookUrl: string,
    opts: { skipMtls?: boolean } = {},
  ): Promise<any> {
    return this.request('PUT', `/v2/webhook/${chave}`, {
      body: { webhookUrl },
      headers: opts.skipMtls ? { 'x-skip-mtls-checking': 'true' } : undefined,
      idempotent: true,
    })
  }

  createEvp(): Promise<{ chave: string }> {
    // POST não-idempotente (gera uma chave aleatória): não repetir em falha.
    return this.request('POST', '/v2/gn/evp', { idempotent: false })
  }

  listEvp(): Promise<{ chaves: string[] }> {
    return this.request('GET', '/v2/gn/evp')
  }
}
