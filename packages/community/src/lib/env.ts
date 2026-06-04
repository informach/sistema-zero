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
