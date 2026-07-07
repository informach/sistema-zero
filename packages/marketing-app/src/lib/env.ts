import 'server-only'
import { z } from 'zod'

/**
 * Env do servidor (fail-fast). NUNCA é importado por Client Component — `server-only`
 * garante o erro de build se vazar para o bundle do cliente.
 */
const EnvSchema = z
  .object({
    GATEWAY_URL: z.string().url().default('http://localhost:3000'),
    // Verificação do access JWT — HS256 (segredo compartilhado; dev/local) e/ou
    // RS256 via JWKS (PRODUÇÃO: o auth emite RS256 e não há segredo HS256 lá —
    // aponte p/ o gateway: <GATEWAY_URL>/auth/.well-known/jwks.json).
    // Pelo menos UM dos dois é obrigatório (refine abaixo).
    JWT_HS256_SECRET: z.string().min(16, 'JWT_HS256_SECRET deve ter ≥16 chars').optional(),
    JWT_JWKS_URL: z.string().url().optional(),
    JWT_ISSUER: z.string().optional(),
    JWT_AUDIENCE: z.string().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Sentry (opcional): ausente = no-op. Espelho de erros LOCAIS do app.
    SENTRY_DSN: z.string().url().optional(),
  })
  // Sem nenhuma forma de verificar o token, toda sessão seria inválida em silêncio.
  .refine((e) => Boolean(e.JWT_HS256_SECRET || e.JWT_JWKS_URL), {
    message:
      'Configure JWT_HS256_SECRET (dev/HS256) e/ou JWT_JWKS_URL (produção/RS256 via gateway)',
    path: ['JWT_JWKS_URL'],
  })
  // Em PRODUÇÃO o auth emite RS256 e o gateway verifica via JWKS — HS256 não tem
  // lugar aqui. Exigir JWKS e RECUSAR um segredo HS256 fecha o vetor de um segredo
  // fraco copiado de dev forjar token aceito na autorização LOCAL (gate de UI).
  .refine((e) => e.NODE_ENV !== 'production' || Boolean(e.JWT_JWKS_URL), {
    message: 'Em produção, JWT_JWKS_URL é obrigatório (o auth emite RS256 via JWKS)',
    path: ['JWT_JWKS_URL'],
  })
  .refine((e) => e.NODE_ENV !== 'production' || !e.JWT_HS256_SECRET, {
    message:
      'Em produção, NÃO configure JWT_HS256_SECRET (um segredo HS256 forjaria a sessão local)',
    path: ['JWT_HS256_SECRET'],
  })

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Env inválida no @sistemazero/marketing-app: ${issues}`)
  }
  cached = parsed.data
  return cached
}

export function isProd(): boolean {
  return getEnv().NODE_ENV === 'production'
}
