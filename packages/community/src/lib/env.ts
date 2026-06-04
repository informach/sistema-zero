import 'server-only'
import { z } from 'zod'

/**
 * Env do servidor (fail-fast). NUNCA é importado por Client Component — `server-only`
 * garante o erro de build se vazar para o bundle do cliente.
 */
const EnvSchema = z.object({
  GATEWAY_URL: z.string().url().default('http://localhost:3000'),
  JWT_HS256_SECRET: z.string().min(16, 'JWT_HS256_SECRET deve ter ≥16 chars'),
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
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
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
