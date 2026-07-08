/**
 * Fail-fast de env em DEV (convenção `instrumentation` do Next). ⚠️ Em PRODUÇÃO
 * o Next 16 NÃO roda o `register()` no boot (o `NextServer.prepare()` pula em
 * prod e o `route-module.prepare` dispara a instrumentation por request SEM
 * await — um throw aqui não derruba o servidor). O fail-fast REAL de produção é
 * o launcher `scripts/boot-check.mjs` (CMD do Dockerfile) — MESMAS regras;
 * mantenha os dois em sincronia. NÃO importa código do app (módulos
 * `server-only` não resolvem neste contexto) — valida o `process.env` cru; o
 * shape fino continua no zod do `lib/env.ts` no primeiro uso.
 */
export function register(): void {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const prod = process.env.NODE_ENV === 'production'
  const problems: string[] = []

  const hs256 = process.env.JWT_HS256_SECRET?.trim()
  const jwksUrl = process.env.JWT_JWKS_URL?.trim()
  if (!hs256 && !jwksUrl) {
    problems.push(
      'JWT_HS256_SECRET (dev/HS256) e/ou JWT_JWKS_URL (prod/RS256) — verificação de sessão',
    )
  }
  if (hs256 && hs256.length < 16) problems.push('JWT_HS256_SECRET com menos de 16 chars')

  if (prod) {
    // Mesma régua que o gateway impõe a si mesmo em prod.
    if (!process.env.GATEWAY_URL?.trim()) {
      problems.push('GATEWAY_URL explícito (o default localhost não vale em produção)')
    }
    if (!process.env.JWT_ISSUER?.trim() || !process.env.JWT_AUDIENCE?.trim()) {
      problems.push('JWT_ISSUER e JWT_AUDIENCE (pinagem do emissor — regra de prod do gateway)')
    }
    // Prod usa SÓ RS256 via JWKS; um segredo HS256 forjaria a sessão local do
    // gate de UI (mantenha em sincronia com o refine do lib/env.ts).
    if (!jwksUrl) problems.push('JWT_JWKS_URL (produção exige RS256 via JWKS do gateway)')
    if (hs256) {
      problems.push(
        'JWT_HS256_SECRET não deve existir em produção (use só JWKS — HS256 forjaria sessão)',
      )
    }
  }

  if (problems.length > 0) {
    throw new Error(`@sistemazero/helpdesk-app: env de boot inválida — ${problems.join('; ')}`)
  }
}

/**
 * Hook nativo do Next 16: captura TODA exceção inesperada de Route Handler/RSC
 * para o Sentry. Import dinâmico p/ não carregar nada extra no caminho do
 * `register()`/boot; falha de captura nunca propaga.
 */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routeType: string },
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const { captureServerException } = await import('@/server/sentry')
    captureServerException(err, {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routeType: context.routeType,
    })
  } catch {
    // observabilidade nunca propaga
  }
}
