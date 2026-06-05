import { z } from 'zod'

/**
 * Booleano a partir de string de ambiente, com default. Aceita apenas
 * `true/false/1/0` (case-insensitive) — valores inválidos FALHAM no boot.
 */
const BOOL_VALUES = new Set(['true', 'false', '1', '0'])
const optionalBool = (def: boolean) =>
  z
    .string()
    .optional()
    .refine((v) => v === undefined || BOOL_VALUES.has(v.toLowerCase()), {
      message: "deve ser 'true', 'false', '1' ou '0'",
    })
    .transform((v) => (v === undefined ? def : v.toLowerCase() === 'true' || v === '1'))

/**
 * Segredo opcional: vazio/whitespace = ausente (igual ao tratamento do
 * gateway.config.ts); quando presente, exige ≥16 chars (segredo curto = auth
 * efetivamente desabilitada).
 */
const optionalSecret = z
  .string()
  .optional()
  .transform((v) => v?.trim() || undefined)
  .refine((v) => v === undefined || v.length >= 16, {
    message: 'deve ter ao menos 16 caracteres',
  })

/** Segredos opcionais em dev que viram OBRIGATÓRIOS em produção (fail-fast no boot). */
const PROD_REQUIRED_SECRETS: ReadonlyArray<{ key: string; why: string }> = [
  { key: 'METRICS_TOKEN', why: 'protege GET /metrics e o snapshot do /readyz na borda pública' },
  { key: 'MEMBERS_INTERNAL_TOKEN', why: 'prova ao members que a chamada veio do gateway' },
  { key: 'CATALOG_INTERNAL_TOKEN', why: 'prova ao catalog que a chamada veio do gateway' },
  { key: 'MESSAGING_INTERNAL_TOKEN', why: 'prova ao messaging que a chamada veio do gateway' },
  { key: 'AUTH_INTERNAL_TOKEN', why: 'prova ao auth que a chamada veio do gateway' },
  {
    key: 'PAYMENTS_INTERNAL_TOKEN',
    why: 'prova ao payments que a chamada veio do gateway (admin + minhas compras)',
  },
]

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Backend de estado compartilhado (rate limit, cache de sessão/JWKS, circuit breaker).
    STATE_BACKEND: z.enum(['memory', 'redis']).default('memory'),
    REDIS_URL: z.string().optional(),

    // Config declarativa do gateway: por caminho de arquivo OU inline (JSON).
    GATEWAY_CONFIG_PATH: z.string().default('./gateway.config.ts'),
    GATEWAY_CONFIG_JSON: z.string().optional(),

    // Resolução de IP do cliente atrás de proxy/LB (Railway injeta X-Forwarded-For).
    // Em produção DEVE ser definido explicitamente (validado em loadEnv): o default
    // silencioso atrás de proxy colapsaria todos os clientes no IP do edge — um
    // único balde de rate limit (lockout/outage coletivo).
    TRUST_PROXY: optionalBool(false),
    TRUSTED_PROXY_HOPS: z.coerce.number().int().positive().default(1),

    // Teto GLOBAL do corpo (bytes) — enforçado pelo `maxRequestBodySize` do
    // Bun.serve (413 automático). 2 MB: os webhooks de evento da SendGrid chegam
    // em lotes de até ~2 MB (o messaging os aceita até esse teto) — 1 MB na borda
    // os perderia em silêncio. Rotas individuais AFINAM o teto via
    // `maxBodyBytes` na config (nunca o aumentam — validado no boot).
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(2 * 1024 * 1024),

    // Rate limit global default (por identidade).
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

    // Safety-net GLOBAL por IP, sobre TODAS as rotas (só tráfego anônimo — clientes
    // autenticados são isentos). Teto alto = não atrapalha uso normal, corta flood.
    // 0 desabilita o stage. Ver global-rate-limit.stage.ts.
    GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().nonnegative().default(1200),
    GLOBAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

    // Auth JWT. A `jwt` strategy liga quando JWT_JWKS_URL e/ou JWT_HS256_SECRET
    // existem (validado por rota no loader da config). O emissor é o @sistemazero/auth.
    // Em produção, rotas jwt exigem TAMBÉM issuer+audience (validado no loader).
    JWT_ISSUER: z.string().optional(),
    JWT_AUDIENCE: z.string().optional(),
    JWT_JWKS_URL: z.string().optional(),
    // Segredo HS256 compartilhado com o emissor (auth) — verifica tokens HS256 sem JWKS.
    JWT_HS256_SECRET: z.string().optional(),
    // Algoritmos aceitos (CSV). Pin contra alg-confusion/downgrade. Default: RS256.
    JWT_ALGORITHMS: z
      .string()
      .optional()
      .transform((v) =>
        v
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),

    // Auth HMAC (clientes sistema-a-sistema do gateway) — anti-replay.
    HMAC_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),

    // Credenciais do gateway como consumer de um upstream (rotas upstreamAuth=resign).
    GATEWAY_CONSUMER_ID: z.string().optional(),
    GATEWAY_HMAC_SECRET: z.string().optional(),

    // Token do GET /metrics e do snapshot do /readyz (o gateway é a BORDA pública).
    // Header `x-metrics-token` ou `Authorization: Bearer`. OBRIGATÓRIO em produção.
    METRICS_TOKEN: optionalSecret,

    // Tokens internos injetados por header-inject no gateway.config.ts (defesa em
    // profundidade: provam ao upstream que a chamada passou pelo gateway). O config
    // os lê DIRETO de process.env; aqui só validamos (≥16 chars; obrigatórios em
    // produção — vazio = injeção silenciosamente desligada, só aceitável em dev).
    MEMBERS_INTERNAL_TOKEN: optionalSecret,
    CATALOG_INTERNAL_TOKEN: optionalSecret,
    MESSAGING_INTERNAL_TOKEN: optionalSecret,
    AUTH_INTERNAL_TOKEN: optionalSecret,
    PAYMENTS_INTERNAL_TOKEN: optionalSecret,

    // Resiliência.
    HEALTH_PROBE_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
    CB_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.5),
    CB_MIN_THROUGHPUT: z.coerce.number().int().positive().default(20),
    CB_COOLDOWN_MS: z.coerce.number().int().positive().default(10_000),

    // Drain gracioso: no SIGTERM, /readyz vira 503 por este tempo (o LB para de
    // rotear) antes de parar o servidor. 0 = sem espera (dev/local).
    SHUTDOWN_DRAIN_MS: z.coerce.number().int().nonnegative().default(0),

    // URL do upstream payments (lida pelo gateway.config.ts).
    PAYMENTS_URL: z.string().default('http://localhost:3001'),

    // URL do serviço de identidade (@sistemazero/auth) — lida pelo gateway.config.ts.
    AUTH_URL: z.string().default('http://localhost:3002'),

    // Funil (@sistemazero/funnel) como upstream + cliente HMAC de borda (BFF de
    // pagamentos). Lidas pelo gateway.config.ts.
    FUNNEL_URL: z.string().default('http://localhost:4321'),
    FUNNEL_HMAC_SECRET: z.string().optional(),
    FUNNEL_INTERNAL_TOKEN: z.string().optional(),
    FUNNEL_ALLOWED_CIDRS: z.string().optional(),
  })
  .refine((e) => e.STATE_BACKEND !== 'redis' || Boolean(e.REDIS_URL?.trim()), {
    message: 'REDIS_URL é obrigatória quando STATE_BACKEND=redis',
    path: ['REDIS_URL'],
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV !== 'production') return
    for (const { key, why } of PROD_REQUIRED_SECRETS) {
      if (!(e as Record<string, unknown>)[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: `obrigatório em produção (${why})` })
      }
    }
  })

export type Env = z.infer<typeof EnvSchema>

/** Valida e tipa as variáveis de ambiente no boot (fail-fast). */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`)
  }
  // Em produção TRUST_PROXY precisa ser uma DECISÃO explícita do operador (a
  // checagem é na fonte crua — o default do schema mascararia a ausência).
  if (parsed.data.NODE_ENV === 'production' && source.TRUST_PROXY === undefined) {
    throw new Error(
      'Em produção defina TRUST_PROXY explicitamente: true atrás de proxy/LB ' +
        '(ex.: domínio público do Railway), false apenas com tráfego direto/rede ' +
        'privada. O default silencioso (false) atrás de proxy faria todos os ' +
        'clientes compartilharem o IP do edge num único balde de rate limit.',
    )
  }
  // Em produção o drain do SIGTERM só vale com espera > 0 (readyz 503 → o LB
  // para de rotear → requisições em voo terminam). Sem a env, default de 5s —
  // o default 0 do schema (dev/local) tornaria o graceful shutdown inócuo.
  if (parsed.data.NODE_ENV === 'production' && source.SHUTDOWN_DRAIN_MS === undefined) {
    return { ...parsed.data, SHUTDOWN_DRAIN_MS: 5_000 }
  }
  return parsed.data
}
