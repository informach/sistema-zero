/**
 * Espelho de erros do BFF para o Sentry (uso **server-side**: importado por
 * `server/*` e pelo `onRequestError` da instrumentation — por isso SEM o marcador
 * `server-only`, que travaria o import dinâmico do hook).
 *
 * ⚠️ Por que NÃO o SDK `@sentry/bun`/`@sentry/node` (como os serviços Elysia)?
 * Os outros serviços rodam no Bun, onde o SDK é um dep normal. AQUI o app é
 * Next App Router com `output: 'standalone'` + Turbopack: o server BUNDLA os deps
 * no chunk, e um pacote `serverExternalPackages` (necessário p/ o SDK do Sentry,
 * que usa `require-in-the-middle`/OpenTelemetry) precisa ser TRAÇADO p/ o
 * `node_modules` do standalone — o que o tracing do Turbopack não faz de forma
 * confiável (verificado: nem o `sharp` externo é copiado). Em vez de depender
 * disso, falamos o protocolo de ingestão do Sentry direto via `fetch` (embutido no
 * runtime) — zero dependência nova, mesmo comportamento em dev/build/container.
 *
 * Política (espelha o princípio do gateway: capturar SÓ o sinal que este serviço
 * vê de forma única): erros LOCAIS do painel — pipeline de mídia (R2/Vimeo) e
 * exceções inesperadas de Route Handler/RSC (via `onRequestError`). 5xx de
 * upstream NÃO são espelhados aqui — o gateway já os captura (evita duplicar).
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
    // agrupamento fica por tipo+mensagem, suficiente p/ o volume do painel).
    extra: { ...input.context, ...(input.stack ? { stack: input.stack } : {}) },
  })
  return `${header}\n${itemHeader}\n${event}\n`
}

const INGEST_TIMEOUT_MS = 4000

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
    const body = buildEnvelope({
      eventId: randomUUID().replace(/-/g, ''),
      sentAt: new Date().toISOString(),
      errorType: type,
      errorValue: value,
      stack,
      context,
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
