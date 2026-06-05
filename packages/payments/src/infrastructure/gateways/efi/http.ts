import { EfiGatewayError } from './efi.errors'

/**
 * Helpers de resiliência HTTP **sem certificado** (tipados com `RequestInit`),
 * compartilhados pelos clientes nativos da Efí. Tipo cert-agnóstico de
 * propósito: o cliente de boleto (API Cobranças) NÃO usa mTLS, e estas funções
 * nunca recebem `tls` — impedindo que a configuração do Pix vaze para o boleto.
 */

/** `fetch` com timeout via `AbortController` — impede sockets pendurados de travar o caller. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof EfiGatewayError) {
    return error.status === 429 || (error.status !== undefined && error.status >= 500)
  }
  // Erro de rede (ECONNRESET, timeout/abort, etc.) → vale tentar de novo.
  return true
}

/**
 * Executa `fn` com retry+backoff exponencial (com jitter) em erros transitórios.
 *
 * `totalBudgetMs` é o teto de tempo da OPERAÇÃO INTEIRA (todas as tentativas +
 * backoff): uma nova tentativa só é feita se couber por completo (pior caso =
 * `attemptTimeoutMs`) dentro do budget. Sem ele, o pior caso real é
 * `(maxRetries+1) × attemptTimeoutMs + backoff` (~86s com os defaults) — acima
 * do timeout do gateway (35s) E do TTL da reserva de idempotência (60s), cuja
 * expiração com a request original viva reabre a janela de cobrança duplicada.
 * A 1ª tentativa SEMPRE roda (o budget só corta retries).
 */
export async function withRetry<T>(
  context: string,
  idempotent: boolean,
  opts: { maxRetries: number; baseMs: number; totalBudgetMs?: number; attemptTimeoutMs?: number },
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  let lastError: unknown
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      // Não repetir chamadas não-idempotentes: a 1ª pode ter tido efeito mesmo
      // com resposta perdida (ex.: cobrança criada → duplicaria).
      if (!idempotent || attempt === opts.maxRetries || !isRetryable(error)) break
      const delay = Math.min(opts.baseMs * 2 ** attempt, 2000) + Math.floor(Math.random() * 100)
      if (opts.totalBudgetMs !== undefined) {
        const elapsed = Date.now() - startedAt
        if (elapsed + delay + (opts.attemptTimeoutMs ?? 0) > opts.totalBudgetMs) break
      }
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

/** Constrói um `EfiGatewayError` a partir de uma resposta HTTP de erro. */
export async function responseToEfiError(res: Response, context: string): Promise<EfiGatewayError> {
  let detail: Record<string, unknown> | undefined
  try {
    detail = (await res.json()) as Record<string, unknown>
  } catch {
    detail = undefined
  }
  const d = detail ?? {}
  const message = String(
    d.mensagem ??
      d.detail ??
      d.error_description ??
      d.title ??
      d.nome ??
      d.message ??
      `HTTP ${res.status}`,
  )
  const code = d.nome ?? d.error ?? d.type ?? d.code
  return new EfiGatewayError(
    `Efí [${context}]: ${message}`,
    code != null ? String(code) : String(res.status),
    detail,
    res.status,
  )
}
