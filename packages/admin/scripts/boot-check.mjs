/**
 * Launcher de PRODUÇÃO do painel (CMD do Dockerfile): valida a env e SÓ então
 * sobe o `server.js` do Next standalone.
 *
 * Por que não só o `instrumentation.ts`? Em produção o Next 16 NÃO roda o
 * `register()` no boot: o `NextServer.prepare()` pula em prod e o
 * `route-module.prepare` chama `ensureInstrumentationRegistered` por request
 * SEM await (fire-and-forget) — um `throw` ali não derruba o servidor
 * (verificado empiricamente no standalone 16.2.7). A instrumentation segue no
 * repo p/ feedback em DEV; este script é o fail-fast REAL de produção.
 *
 * Mantenha as regras em sincronia com `src/instrumentation.ts`.
 */
const prod = process.env.NODE_ENV === 'production'
const problems = []

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
}

if (problems.length > 0) {
  console.error(`@sistemazero/admin: env de boot inválida — ${problems.join('; ')}`)
  process.exit(1)
}

// Validação ok → sobe o servidor standalone (mesma pasta deste launcher na imagem).
await import('./server.js')
