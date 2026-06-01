import { z } from 'zod'

/**
 * Validação fail-fast das variáveis de ambiente do servidor (espelha o padrão do
 * payments). Lida APENAS no lado do servidor (endpoints `/api/*` e páginas SSR) —
 * NUNCA importe este módulo de uma ilha React (segredos não podem ir ao browser).
 * Páginas estáticas (prerender) também não devem chamar `getEnv()`.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),

  GATEWAY_URL: z.string().min(1, 'GATEWAY_URL é obrigatória'),
  FUNNEL_CONSUMER_ID: z.string().default('funnel'),
  FUNNEL_HMAC_SECRET: z.string().min(1, 'FUNNEL_HMAC_SECRET é obrigatória'),

  FUNNEL_INTERNAL_TOKEN: z.string().min(1, 'FUNNEL_INTERNAL_TOKEN é obrigatória'),

  PRODUCT_PRICE_CENTS: z.coerce.number().int().positive().default(3700),
  PRODUCT_SKU: z.string().default('no-comando-da-ia'),
  PRODUCT_NAME: z.string().default('No Comando da IA'),

  ADMIN_USER: z.string().min(1, 'ADMIN_USER é obrigatória'),
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD é obrigatória'),
  // Segredo que assina o cookie de sessão do admin (login in-app). ≥16 chars.
  ADMIN_SESSION_SECRET: z.string().min(16, 'ADMIN_SESSION_SECRET é obrigatória (≥16 chars)'),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | undefined

/** Lê e valida o ambiente uma única vez (cacheado). Lança no boot se faltar algo. */
export function getEnv(): Env {
  if (!cached) {
    cached = EnvSchema.parse(process.env)
  }
  return cached
}

/** Permite injetar um ambiente já validado em testes (sem ler `process.env`). */
export function setEnvForTests(env: Partial<Env>): void {
  cached = EnvSchema.parse({ ...process.env, ...env })
}
