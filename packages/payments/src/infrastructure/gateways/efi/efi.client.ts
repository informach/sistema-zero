/** biome-ignore-all lint/suspicious/noExplicitAny: any */
import { responseToEfiError, withRetry } from './http'

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
  /**
   * Timeout POR TENTATIVA, em ms (aborta sockets pendurados). Padrão 20s — o
   * handshake mTLS frio leva ~15-16s sob Bun (15s abortava no fim do handshake
   * → PIX 502). Mantenha alinhado a `EFI_REQUEST_TIMEOUT_MS`.
   */
  requestTimeoutMs?: number
  /**
   * Teto de tempo da operação INTEIRA (tentativas + backoff), em ms. Padrão 30s
   * — precisa caber no timeout do gateway (35s) e folgar sob o TTL da reserva
   * de idempotência (60s). Ver `withRetry` em `http.ts`.
   */
  totalBudgetMs?: number
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
  private readonly retryOpts: {
    maxRetries: number
    baseMs: number
    totalBudgetMs: number
    attemptTimeoutMs: number
  }
  private readonly requestTimeoutMs: number
  private token: { value: string; expiresAt: number } | null = null
  private authInFlight: Promise<string> | null = null

  constructor(private readonly config: EfiClientConfig) {
    this.baseUrl = config.sandbox
      ? 'https://pix-h.api.efipay.com.br'
      : 'https://pix.api.efipay.com.br'
    this.tls = { cert: config.cert, key: config.key }
    this.requestTimeoutMs = config.requestTimeoutMs ?? 20_000
    this.retryOpts = {
      maxRetries: config.maxRetries ?? 3,
      baseMs: config.retryBaseMs ?? 200,
      totalBudgetMs: config.totalBudgetMs ?? 30_000,
      attemptTimeoutMs: this.requestTimeoutMs,
    }
  }

  /**
   * Pré-aquece o token OAuth (mTLS + client_credentials). O handshake mTLS sob
   * Bun é caro num processo frio/ocioso (~15-16s observados) — chamar isto no boot
   * E periodicamente tira esse custo do caminho da cobrança (que senão estoura o
   * `requestTimeoutMs` → 502 no funil). Best-effort: relança o erro para o
   * chamador logar; não deve travar o boot.
   *
   * @param minTtlMs renova se o token não sobreviver a essa janela (default 60s —
   * o mesmo skew do hot path). O re-warm periódico passa `intervalo + margem`
   * para garantir que o token SEMPRE chegue vivo ao próximo tick (token Pix vive
   * 1h; um tick aos 45min com o default seria no-op e deixaria a renovação cara
   * cair dentro de uma request de checkout).
   */
  async warmUp(minTtlMs = 60_000): Promise<void> {
    await this.authorize(minTtlMs)
  }

  private async authorize(minTtlMs = 60_000): Promise<string> {
    const now = Date.now()
    if (this.token && this.token.expiresAt > now + minTtlMs) return this.token.value

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
    const json = await withRetry('autenticação', true, this.retryOpts, async () => {
      const init: BunFetchInit = {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'client_credentials' }),
        tls: this.tls,
      }
      const res = await this.fetchWithTimeout(`${this.baseUrl}/oauth/token`, init)
      if (!res.ok) throw await responseToEfiError(res, 'autenticação')
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
    return withRetry(`${method} ${path}`, idempotent, this.retryOpts, async () => {
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
      if (!res.ok) throw await responseToEfiError(res, `${method} ${path}`)
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

  /**
   * Solicita a devolução (estorno) de um Pix recebido —
   * `PUT /v2/pix/{e2eId}/devolucao/{id}`. PUT idempotente: reenviar o MESMO `id`
   * (determinístico, derivado do pagamento) não cria uma 2ª devolução. `body` =
   * `{ valor: "10.00" }` (devolução total = valor original).
   */
  refundPix(e2eId: string, devolutionId: string, body: Record<string, unknown>): Promise<any> {
    return this.request('PUT', `/v2/pix/${e2eId}/devolucao/${devolutionId}`, {
      body,
      idempotent: true,
    })
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
