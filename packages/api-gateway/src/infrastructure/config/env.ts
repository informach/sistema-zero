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
    TRUST_PROXY: optionalBool(false),
    TRUSTED_PROXY_HOPS: z.coerce.number().int().positive().default(1),

    // Teto do corpo (bytes). 1 MB — maior que o payments pois aqui é streamado.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(1024 * 1024),

    // Defaults de proxy (sobrescrevíveis por serviço/rota na config).
    DEFAULT_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    DEFAULT_RETRIES: z.coerce.number().int().nonnegative().default(0),

    // Rate limit global default (por identidade).
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

    // Safety-net GLOBAL por IP, sobre TODAS as rotas (só tráfego anônimo — clientes
    // autenticados são isentos). Teto alto = não atrapalha uso normal, corta flood.
    // 0 desabilita o stage. Ver global-rate-limit.stage.ts.
    GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().nonnegative().default(1200),
    GLOBAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

    // Auth JWT/sessão (dormente até existir um emissor; obrigatório por rota validado no loader da config).
    JWT_ISSUER: z.string().optional(),
    JWT_AUDIENCE: z.string().optional(),
    JWT_JWKS_URL: z.string().optional(),
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
    JWT_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
    SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(3_600),

    // Auth HMAC (clientes sistema-a-sistema do gateway) — anti-replay.
    HMAC_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),

    // Credenciais do gateway como consumer de um upstream (rotas upstreamAuth=resign).
    GATEWAY_CONSUMER_ID: z.string().optional(),
    GATEWAY_HMAC_SECRET: z.string().optional(),

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
  return parsed.data
}
