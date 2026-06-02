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

  // Fonte da verdade do preço/inclusões: o catálogo (@sistemazero/catalog) via gateway.
  // `CATALOG_OFFER_SLUG` é a OFERTA ativa que o funil vende; o preço autoritativo vem da
  // cotação dessa oferta. PRODUCT_* abaixo viram apenas rótulos de descrição/fallback.
  CATALOG_OFFER_SLUG: z.string().default('no-comando-da-ia'),
  PRODUCT_PRICE_CENTS: z.coerce.number().int().positive().default(3700),
  PRODUCT_SKU: z.string().default('no-comando-da-ia'),
  PRODUCT_NAME: z.string().default('No Comando da IA'),
  // Admin: a sessão agora é o JWT do auth (IdP) guardado em cookie HttpOnly e
  // validado via gateway `/auth/me` — o funil não guarda credencial/segredo de admin.
  // Crie o usuário admin no auth: `bun run --filter @sistemazero/auth db:seed
  // --email <e> --password <p> --role admin`.
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
