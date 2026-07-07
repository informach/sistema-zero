import { z } from 'zod'

/**
 * Booleano a partir de string de ambiente, com default. Aceita `true/false/1/0`
 * (case-insensitive); valores inválidos FALHAM no boot.
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

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3011),
  // `::` (default) é dual-stack (IPv4 + IPv6) — obrigatório para o private
  // networking do Railway (`marketing.railway.internal` resolve IPv6).
  HOST: z.string().min(1).default('::'),
  // Roteiros/legendas em Markdown são maiores que um login — 512 KB.
  MAX_REQUEST_BODY_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(512 * 1024),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  // TLS na conexão (Postgres fora da rede privada). Default false (Railway
  // private networking dispensa).
  DATABASE_SSL: optionalBool(false),

  // Sentry. Ausente = desligado (dev/local).
  SENTRY_DSN: z.string().url().optional(),

  // Defesa em profundidade: o gateway injeta `x-internal-token` com ESTE valor e o
  // marketing o exige em TODAS as rotas. Obrigatório também fora de produção:
  // sem ele a app subiria, mas toda rota protegida retornaria 401.
  INTERNAL_API_TOKEN: z.string().min(16, 'INTERNAL_API_TOKEN deve ter ao menos 16 caracteres'),

  // RBAC (staff+) conferido nos X-Auth-User-* (o RBAC real é do gateway; defesa
  // em profundidade). Em dev sem gateway pode-se desligar.
  REQUIRE_STAFF: optionalBool(true),

  // ── R2 (mídia do app) — opcionais: ausentes → presign responde 503 amigável ──
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_MARKETING_BUCKET: z.string().optional(),
  // Teto de upload (default 2 GB — vídeo longo do YouTube).
  MARKETING_MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024 * 1024),
  // Validade do presigned PUT (upload lento de vídeo grande) e do presigned GET.
  R2_PRESIGN_PUT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  R2_PRESIGN_GET_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(24 * 3600),

  // Retenção do histórico e limpeza periódica.
  OAUTH_STATE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  RETENTION_CLEANUP_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(6 * 60 * 60 * 1000),
  METRICS_RETENTION_DAYS: z.coerce.number().int().positive().default(730),
  STAGE_EVENTS_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
})

export type Env = z.infer<typeof EnvSchema>

/** Config R2 completa ou null (feature desligada — presign responde 503). */
export function r2Config(env: Env): {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
} | null {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_MARKETING_BUCKET
  ) {
    return null
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_MARKETING_BUCKET,
  }
}

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
