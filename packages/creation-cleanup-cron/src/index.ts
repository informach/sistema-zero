/**
 * Scheduler da LIMPEZA DURÁVEL das criações excluídas ("Guardado na sua conta", 19/08/2026).
 *
 * O community-kids expõe `POST /api/internal/creation-cleanups` (member-shell
 * `routes/creation-cleanup.ts`): cada chamada reivindica até 25 jobs no members, apaga os
 * prefixos do R2 UGC das contas excluídas e confirma/falha o job. A rota fica fora do proxy
 * de sessão e é autenticada por bearer (`CREATION_CLEANUP_CRON_SECRET` do app). O que falta a
 * ela é QUEM a chame a cada 5 minutos — é só isso que este Worker faz.
 *
 * Um Worker, dois alvos: staging e produção têm segredos DISTINTOS (gerados em 19/08), cada um
 * em Secret do Worker (`STAGING_SECRET`/`PRODUCTION_SECRET`), nunca neste código. Um alvo sem
 * URL ou sem segredo é PULADO com aviso (não derruba o outro). As duas chamadas correm em
 * paralelo e o cron NUNCA lança: falha vira log, e o `ctx.waitUntil` garante que a execução
 * termine mesmo depois de o handler devolver.
 *
 * Contrato da rota (docs/ambientes-e-fluxo.md): `200 {completed, failed}` = execução normal;
 * `401` = segredo divergente; `503` = app sem configuração; `502` = falha ao reivindicar no
 * upstream. Tudo isso é logado por alvo para o `wrangler tail` mostrar o que houve.
 */

export interface Env {
  STAGING_URL?: string
  PRODUCTION_URL?: string
  STAGING_SECRET?: string
  PRODUCTION_SECRET?: string
}

const ROUTE = '/api/internal/creation-cleanups'
const TIMEOUT_MS = 25_000

export type Target = 'staging' | 'production'

export interface TargetResult {
  target: Target
  skipped?: 'sem-url' | 'sem-segredo'
  status?: number
  body?: string
  error?: string
}

function baseUrl(raw: string | undefined): string | null {
  const v = raw?.trim()
  if (!v) return null
  return v.endsWith('/') ? v.slice(0, -1) : v
}

/** Uma chamada ao worker de limpeza de UM ambiente. Nunca lança. */
export async function runTarget(
  target: Target,
  url: string | undefined,
  secret: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<TargetResult> {
  const base = baseUrl(url)
  if (!base) return { target, skipped: 'sem-url' }
  const bearer = secret?.trim()
  if (!bearer) return { target, skipped: 'sem-segredo' }
  try {
    const response = await fetchImpl(`${base}${ROUTE}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${bearer}`,
        'user-agent': 'sistemazero-creation-cleanup-cron',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const body = (await response.text().catch(() => '')).slice(0, 300)
    return { target, status: response.status, body }
  } catch (error) {
    return { target, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function runAll(env: Env, fetchImpl: typeof fetch = fetch): Promise<TargetResult[]> {
  return Promise.all([
    runTarget('staging', env.STAGING_URL, env.STAGING_SECRET, fetchImpl),
    runTarget('production', env.PRODUCTION_URL, env.PRODUCTION_SECRET, fetchImpl),
  ])
}

function logResults(results: TargetResult[]): void {
  for (const r of results) {
    if (r.skipped) {
      console.warn(`[creation-cleanup-cron] ${r.target}: pulado (${r.skipped})`)
    } else if (r.error) {
      console.error(`[creation-cleanup-cron] ${r.target}: erro de rede: ${r.error}`)
    } else if (r.status === 200) {
      console.log(`[creation-cleanup-cron] ${r.target}: ok ${r.body}`)
    } else {
      console.error(`[creation-cleanup-cron] ${r.target}: HTTP ${r.status} ${r.body}`)
    }
  }
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runAll(env).then(logResults))
  },
  // Sem superfície HTTP: o Worker existe só pelo cron. (O 404 evita que vire endpoint.)
  async fetch(): Promise<Response> {
    return new Response('not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
