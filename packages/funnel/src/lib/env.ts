import { z } from 'zod'
import { FUNNEL_KEYS } from '../funnels/registry'

/**
 * Nome DETERMINÍSTICO da env que carrega a oferta de um funil: `FUNNEL_OFFER_<KEY>`,
 * com a chave em maiúsculas e tudo que não é A–Z/0–9 virando `_`. Ex.:
 * `pro/no-comando-da-ia` → `FUNNEL_OFFER_PRO_NO_COMANDO_DA_IA`;
 * `kids/desafio-primeiro-jogo` → `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO`.
 */
export function offerEnvKey(funnelKey: string): string {
  return `FUNNEL_OFFER_${funnelKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`
}

/**
 * Mapa `funilKey → offerSlug` lido SÓ das envs (sem fallback no código). Cada funil
 * do registry EXIGE a sua `FUNNEL_OFFER_<KEY>` — faltando uma, LANÇA (fail-fast: o
 * boot/healthcheck do funil falha em vez de cobrar a oferta errada). `lenient` (testes)
 * apenas omite as ausentes.
 */
function readFunnelOffers(src: Record<string, unknown>, lenient = false): Record<string, string> {
  const out: Record<string, string> = {}
  const missing: string[] = []
  for (const key of FUNNEL_KEYS) {
    const raw = src[offerEnvKey(key)]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (value) out[key] = value
    else missing.push(`${offerEnvKey(key)} (funil "${key}")`)
  }
  if (!lenient && missing.length > 0) {
    throw new Error(
      `Oferta não configurada — defina no Railway: ${missing.join(', ')}. ` +
        'A oferta de cada funil vem 100% da env (sem fallback no código).',
    )
  }
  return out
}

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
    // Base do app KIDS (@sistemazero/community-kids) — destino do funil kids (botão
    // "Ir para a área de membros" + link do welcome). Funil pro usa COMMUNITY_URL.
    KIDS_COMMUNITY_URL: z.string().min(1).default('http://localhost:3008'),

    // Sentry (erros). Ausente = desligado (dev/local). Projeto sistema-zero-funnel.
    SENTRY_DSN: z.string().optional(),

    // Oferta do funil: vem 100% da env `FUNNEL_OFFER_<KEY>` (uma por funil, obrigatória,
    // fail-fast — ver `offerEnvKey`/`readFunnelOffers` + `server/offer.ts`). O preço/inclusões
    // são cotados AO VIVO no catálogo por esse slug. PRODUCT_PRICE_CENTS = só rótulo de fallback
    // de PREÇO quando a oferta não é encontrada na cotação.
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
    if (!isHttpUrl(env.KIDS_COMMUNITY_URL)) {
      issue('KIDS_COMMUNITY_URL', 'deve ser uma URL http(s) válida em produção')
    }
    if (env.TRUST_PROXY === undefined) {
      issue('TRUST_PROXY', 'defina explicitamente true|false em produção (Railway usa proxy)')
    }
  })
  .transform((env) => ({ ...env, TRUST_PROXY: env.TRUST_PROXY === 'true' }))

export type Env = z.infer<typeof EnvSchema> & {
  /** Oferta por funil (`funilKey → offerSlug`), lida SÓ das envs. Ver `server/offer.ts`. */
  offerByFunnel: Record<string, string>
}

let cached: Env | undefined

/** Lê e valida o ambiente uma única vez (cacheado). Lança no boot se faltar algo. */
export function getEnv(): Env {
  if (!cached) {
    cached = { ...EnvSchema.parse(process.env), offerByFunnel: readFunnelOffers(process.env) }
  }
  return cached
}

/** Permite injetar um ambiente já validado em testes (sem ler `process.env`). */
export function setEnvForTests(env: Partial<z.input<typeof EnvSchema>>): void {
  const merged = { ...process.env, ...env }
  cached = { ...EnvSchema.parse(merged), offerByFunnel: readFunnelOffers(merged, true) }
}
