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
    // Fallback da página de vendas em "Todos os cursos" (curso sem metadata.salesPageUrl).
    FUNNEL_URL: z.string().url().optional(),
    // Cloudflare R2 (upload de avatar). OPCIONAIS: ausentes → upload responde 503
    // amigável (MEDIA_NOT_CONFIGURED), nunca quebra o boot.
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: z.string().url().optional(),
    // Bucket PRIVADO (materiais didáticos) — leitura p/ a rota de download com marca
    // d'água. Sem URL pública; mesmas credenciais R2. Ausente → download responde 503.
    R2_PRIVATE_BUCKET: z.string().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  // Sem nenhuma forma de verificar o token, toda sessão seria inválida em silêncio.
  .refine((e) => Boolean(e.JWT_HS256_SECRET || e.JWT_JWKS_URL), {
    message:
      'Configure JWT_HS256_SECRET (dev/HS256) e/ou JWT_JWKS_URL (produção/RS256 via gateway)',
    path: ['JWT_JWKS_URL'],
  })

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Env inválida no @sistemazero/community: ${issues}`)
  }
  cached = parsed.data
  return cached
}

export function isProd(): boolean {
  return getEnv().NODE_ENV === 'production'
}
