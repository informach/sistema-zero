import { z } from 'zod'

/** URL http(s) válida (fail-fast de produção — evita base interna mal formada). */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validação fail-fast das variáveis de ambiente do servidor (espelha o padrão do
 * payments). Lida APENAS no lado do servidor (endpoints `/api/*` e páginas SSR) —
 * NUNCA importe este módulo de uma ilha React (segredos não podem ir ao browser).
 * Páginas estáticas (prerender) também não devem chamar `getEnv()`.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),

    GATEWAY_URL: z.string().min(1, 'GATEWAY_URL é obrigatória'),
    FUNNEL_CONSUMER_ID: z.string().default('funnel'),
    FUNNEL_HMAC_SECRET: z.string().min(1, 'FUNNEL_HMAC_SECRET é obrigatória'),

    FUNNEL_INTERNAL_TOKEN: z.string().min(1, 'FUNNEL_INTERNAL_TOKEN é obrigatória'),

    // Atrás de proxy confiável (Railway), o IP real do cliente é o ÚLTIMO hop do
    // x-forwarded-for (sem isto o rate limit veria só o IP do proxy — bucket
    // único p/ todos os visitantes). OBRIGATÓRIO explicitar em produção
    // (true|false; espelha o TRUST_PROXY do gateway/auth).
    TRUST_PROXY: z.enum(['true', 'false']).optional(),

    // Base do app do aluno (@sistemazero/community) — usada p/ montar o link de
    // definir senha no e-mail de boas-vindas pós-compra.
    COMMUNITY_URL: z.string().min(1).default('http://localhost:3007'),

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
  // Fail-fast de PRODUÇÃO (padrão do monorepo): segredos curtos, URLs inválidas
  // ou TRUST_PROXY implícito derrubam o boot — nunca degradam em silêncio.
  // Lembrete: NODE_ENV=production também controla o `Secure` dos cookies.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })
    if (env.FUNNEL_HMAC_SECRET.length < 16) {
      issue('FUNNEL_HMAC_SECRET', 'mínimo de 16 caracteres em produção')
    }
    if (env.FUNNEL_INTERNAL_TOKEN.length < 16) {
      issue('FUNNEL_INTERNAL_TOKEN', 'mínimo de 16 caracteres em produção')
    }
    if (!isHttpUrl(env.GATEWAY_URL)) {
      issue('GATEWAY_URL', 'deve ser uma URL http(s) válida em produção')
    }
    if (!isHttpUrl(env.COMMUNITY_URL)) {
      issue('COMMUNITY_URL', 'deve ser uma URL http(s) válida em produção')
    }
    if (env.TRUST_PROXY === undefined) {
      issue('TRUST_PROXY', 'defina explicitamente true|false em produção (Railway usa proxy)')
    }
  })
  .transform((env) => ({ ...env, TRUST_PROXY: env.TRUST_PROXY === 'true' }))

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
export function setEnvForTests(env: Partial<z.input<typeof EnvSchema>>): void {
  cached = EnvSchema.parse({ ...process.env, ...env })
}
