/**
 * Espelho de erros do BFF para o Sentry (uso **server-side**: importado por
 * `server/*` e pelo `onRequestError` da instrumentation — por isso SEM o marcador
 * `server-only`, que travaria o import dinâmico do hook).
 *
 * ⚠️ Por que NÃO o SDK `@sentry/node` (como os serviços Elysia)? Mesma razão do
 * admin: Next App Router com `output: 'standalone'` + Turbopack BUNDLA os deps no
 * chunk, e um pacote `serverExternalPackages` (necessário p/ o SDK, que usa
 * `require-in-the-middle`/OpenTelemetry) precisaria ser TRAÇADO p/ o
 * `node_modules` do standalone — o que o tracing do Turbopack não faz de forma
 * confiável (verificado: nem o `sharp` externo é copiado). Falamos o protocolo de
 * ingestão direto via `fetch` — zero dependência nova.
 *
 * Política (espelha o princípio do gateway: capturar SÓ o sinal que este serviço
 * vê de forma única): erros LOCAIS da área do aluno — pipeline de mídia
 * (R2/watermark) e exceções inesperadas de Route Handler/RSC (via
 * `onRequestError`). 5xx de upstream NÃO são espelhados aqui — o gateway já os
 * captura (evita duplicar).
 *
 * Sem `SENTRY_DSN` é no-op. O envio é best-effort, fire-and-forget e com timeout —
 * observabilidade NUNCA derruba nem atrasa o caminho principal.
 */
import { randomUUID } from 'node:crypto'

interface ParsedDsn {
  ingestUrl: string
  publicKey: string
}

/**
 * Decompõe o DSN (`https://<publicKey>@<host>/<projectId>`) na URL de ingestão de
 * envelopes + a chave pública. `null` se ausente/malformado (vira no-op). PURO.
 */
export function parseDsn(dsn: string | undefined): ParsedDsn | null {
  if (!dsn) return null
  try {
    const u = new URL(dsn)
    const projectId = u.pathname.replace(/^\/+/, '')
    if (!u.username || !projectId) return null
    // Suporta path-prefix de self-hosted (`/some/path/<projectId>`).
    const segments = projectId.split('/')
    const id = segments.pop()
    const basePath = segments.length ? `/${segments.join('/')}` : ''
    return {
      ingestUrl: `${u.protocol}//${u.host}${basePath}/api/${id}/envelope/?sentry_key=${u.username}&sentry_version=7`,
      publicKey: u.username,
    }
  } catch {
    return null
  }
}

/** Constrói o envelope NDJSON de um evento de exceção. PURO (testável). */
export function buildEnvelope(input: {
  eventId: string
  sentAt: string
  errorType: string
  errorValue: string
  stack?: string
  context?: Record<string, unknown>
}): string {
  const header = JSON.stringify({ event_id: input.eventId, sent_at: input.sentAt })
  const itemHeader = JSON.stringify({ type: 'event' })
  const event = JSON.stringify({
    event_id: input.eventId,
    timestamp: input.sentAt,
    platform: 'node',
    level: 'error',
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    exception: { values: [{ type: input.errorType, value: input.errorValue }] },
    // Stacktrace como string em `extra` (sem o SDK não há frames estruturados; o
    // agrupamento fica por tipo+mensagem, suficiente p/ o volume da área do aluno).
    extra: { ...input.context, ...(input.stack ? { stack: input.stack } : {}) },
  })
  return `${header}\n${itemHeader}\n${event}\n`
}

const INGEST_TIMEOUT_MS = 4000

// ── Redação de PII (kids: NUNCA mandar identificador de criança a um terceiro) ──
// O Sentry é um terceiro. `request.path` do `onRequestError` é o caminho RESOLVIDO
// (com query string), então carrega o UUID do PERFIL da criança em rotas como
// /api/profiles/<uuid>/select|avatar — um identificador estável que recorreria
// entre eventos (re-identificação dentro do Sentry). A mensagem de erro também pode
// interpolar dados no futuro. Redigimos os dois antes do envelope. PURO/testável.
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/gi
const LONG_NUM_RE = /\d{7,}/g
const MAX_VALUE_LEN = 500
const MAX_STACK_LEN = 4000

/** e-mail → [email], UUID → :id, sequência longa de dígitos → :num. */
export function redactPii(value: string): string {
  return value.replace(EMAIL_RE, '[email]').replace(UUID_RE, ':id').replace(LONG_NUM_RE, ':num')
}

/** Caminho seguro p/ telemetria: sem query string + ids redigidos (≈ template). */
export function scrubPath(path: string): string {
  return redactPii(path.split('?')[0] ?? path)
}

function errorParts(error: unknown): { type: string; value: string; stack?: string } {
  if (error instanceof Error) {
    return { type: error.name || 'Error', value: error.message, stack: error.stack }
  }
  return { type: 'NonError', value: typeof error === 'string' ? error : JSON.stringify(error) }
}

/**
 * Captura uma exceção como evento no Sentry (best-effort, fire-and-forget). Sem
 * DSN, no-op. Qualquer falha (rede/parse) é engolida.
 */
export function captureServerException(error: unknown, context?: Record<string, unknown>): void {
  try {
    const dsn = parseDsn(process.env.SENTRY_DSN?.trim())
    if (!dsn) return
    const { type, value, stack } = errorParts(error)
    // `path` (do onRequestError) carrega o UUID do perfil → redige + tira query.
    const safeContext =
      context && typeof context.path === 'string'
        ? { ...context, path: scrubPath(context.path) }
        : context
    const body = buildEnvelope({
      eventId: randomUUID().replace(/-/g, ''),
      sentAt: new Date().toISOString(),
      errorType: type,
      // Redige + limita a mensagem (e o stack) — defesa contra PII em `throw` futuro.
      errorValue: redactPii(value).slice(0, MAX_VALUE_LEN),
      stack: stack ? redactPii(stack).slice(0, MAX_STACK_LEN) : undefined,
      context: safeContext,
    })
    void fetch(dsn.ingestUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
      signal: AbortSignal.timeout(INGEST_TIMEOUT_MS),
    }).catch(() => {
      // nunca propagar falha de observabilidade
    })
  } catch {
    // nunca propagar falha de observabilidade
  }
}
