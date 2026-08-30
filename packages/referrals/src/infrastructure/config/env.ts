import { z } from 'zod'

/** URL aponta p/ loopback? (localhost/127.0.0.1/::1) — inválida entre serviços em deploy. */
function isLoopbackUrl(u: string): boolean {
  try {
    const h = new URL(u).hostname.toLowerCase().replace(/^\[|\]$/g, '')
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost')
  } catch {
    return false
  }
}

const BOOL_VALUES = new Set(['true', 'false', '1', '0'])
const REDEMPTION_LEASE_MARGIN_MS = 5_000
/** Chamadas S2S sequenciais do PIOR caso do resgate: ensure-buyer + grant + token + send. */
const REDEMPTION_SEQUENTIAL_CALLS = 4
const optionalBool = (def: boolean) =>
  z
    .string()
    .optional()
    .refine((v) => v === undefined || BOOL_VALUES.has(v.toLowerCase()), {
      message: "deve ser 'true', 'false', '1' ou '0'",
    })
    .transform((v) => (v === undefined ? def : v.toLowerCase() === 'true' || v === '1'))

/**
 * Env do serviço de indicações. Fail-fast no boot (padrão do monorepo): em
 * produção os tokens/segredos e as URLs não-loopback são OBRIGATÓRIOS — um host
 * mal configurado não sobe, em vez de subir manco (bolsa sem e-mail, admin sem
 * defesa em profundidade).
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Distingue prod de staging no Railway (ambos rodam NODE_ENV=production). */
    APP_ENV: z.enum(['staging', 'production']).optional(),
    PORT: z.coerce.number().int().positive().default(3012),
    HOST: z.string().min(1).default('::'),
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // ── Integrações S2S (tudo via api-gateway, consumer HMAC `referrals`) ────
    GATEWAY_URL: z.string().url().optional(),
    /** Secret do consumer HMAC de borda `referrals` no gateway (o MESMO valor lá). */
    REFERRALS_HMAC_SECRET: z.string().min(16).optional(),
    S2S_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

    // ── Produto / links públicos ─────────────────────────────────────────────
    /** Oferta (catálogo) concedida pela bolsa — a MESMA do comprador. */
    SCHOLARSHIP_OFFER_SLUG: z.string().min(1).default('desafio-primeiro-jogo'),
    /** Base pública do funil (landings /bolsa/<code> e /embaixador/<token>). */
    FUNNEL_PUBLIC_URL: z.string().url().default('http://localhost:4321'),
    /** Base do app kids (link de definir senha do bolsista — a bolsa v1 é kids). */
    KIDS_COMMUNITY_URL: z.string().url().default('http://localhost:3008'),

    // ── Regras ───────────────────────────────────────────────────────────────
    /** Teto diário de convites por embaixador (anti-abuso/anti-spam). */
    INVITE_DAILY_LIMIT: z.coerce.number().int().positive().default(50),
    /** Lease do resgate: cobre as chamadas S2S sequenciais + persistência. */
    REDEMPTION_LEASE_MS: z.coerce.number().int().positive().default(90_000),

    // ── Borda própria ────────────────────────────────────────────────────────
    /** Prova de origem do gateway (header-inject) nas rotas /referrals/*. */
    INTERNAL_API_TOKEN: z.string().min(16).optional(),
    REQUIRE_ADMIN: optionalBool(true),
    METRICS_TOKEN: z.string().min(16).optional(),
    SENTRY_DSN: z.string().url().optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.APP_ENV), {
    message: 'APP_ENV (staging|production) é obrigatório quando NODE_ENV=production',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.REQUIRE_ADMIN, {
    message: 'REQUIRE_ADMIN deve estar habilitado em produção',
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' ||
      Boolean(
        env.INTERNAL_API_TOKEN && env.METRICS_TOKEN && env.GATEWAY_URL && env.REFERRALS_HMAC_SECRET,
      ),
    {
      message:
        'Em produção são obrigatórios: INTERNAL_API_TOKEN, METRICS_TOKEN, GATEWAY_URL e REFERRALS_HMAC_SECRET',
    },
  )
  .refine(
    (env) =>
      env.REDEMPTION_LEASE_MS >=
      REDEMPTION_SEQUENTIAL_CALLS * env.S2S_TIMEOUT_MS + REDEMPTION_LEASE_MARGIN_MS,
    {
      message: 'REDEMPTION_LEASE_MS deve cobrir 4× S2S_TIMEOUT_MS + 5s (o pior caso do resgate)',
    },
  )
  // URLs entre serviços/públicas não podem ser loopback em deploy.
  .refine(
    (env) => env.NODE_ENV !== 'production' || !env.GATEWAY_URL || !isLoopbackUrl(env.GATEWAY_URL),
    {
      message: 'GATEWAY_URL não pode apontar p/ localhost em produção/staging',
    },
  )
  .refine((env) => env.NODE_ENV !== 'production' || !isLoopbackUrl(env.FUNNEL_PUBLIC_URL), {
    message: 'FUNNEL_PUBLIC_URL não pode apontar p/ localhost em produção/staging (vai em e-mail)',
  })
  .refine((env) => env.NODE_ENV !== 'production' || !isLoopbackUrl(env.KIDS_COMMUNITY_URL), {
    message: 'KIDS_COMMUNITY_URL não pode apontar p/ localhost em produção/staging (vai em e-mail)',
  })

export type Env = z.infer<typeof EnvSchema>

export function loadEnv(overrides: Record<string, string | undefined> = {}): Env {
  const parsed = EnvSchema.safeParse({ ...process.env, ...overrides })
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.') || '(env)'}: ${i.message}`)
    throw new Error(`Configuração inválida:\n${issues.join('\n')}`)
  }
  return parsed.data
}
