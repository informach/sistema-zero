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

  // ── OAuth Google (Drive + YouTube) — grupo ATÔMICO: qualquer um ausente →
  // OAuth/Drive respondem 503 OAUTH_NOT_CONFIGURED (boot nunca quebra) ─────────
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Chave da secret-box (32 bytes em base64) — tokens NUNCA em claro no banco.
  MARKETING_TOKEN_ENC_KEY: z
    .string()
    .optional()
    .refine((v) => v === undefined || Buffer.from(v, 'base64').length === 32, {
      message: 'deve ser 32 bytes em base64',
    }),
  // Origem PÚBLICA do gateway (monta a redirect_uri fixa do callback OAuth).
  OAUTH_PUBLIC_BASE_URL: z.string().url().optional(),
  // URL do marketing-app (destino do 302 pós-callback: /conexoes?connected=…).
  MARKETING_APP_URL: z.string().url().optional(),

  // ── Lembrete WhatsApp (marketing → gateway → /messaging/send, HMAC) ─────────
  GATEWAY_URL: z.string().url().default('http://localhost:3000'),
  MARKETING_CONSUMER_ID: z.string().min(1).default('marketing'),
  MARKETING_HMAC_SECRET: z
    .string()
    .min(16, 'MARKETING_HMAC_SECRET deve ter ao menos 16 caracteres')
    .optional(),
  // CSV E.164 com DDI (ex.: 5511999999999,5511888888888). Vazio = lembrete vira
  // no-op logado (a publicação ainda vai a awaiting_manual; o Painel é o fallback).
  MARKETING_REMINDER_PHONES: z.string().optional(),
  MARKETING_REMINDER_RECIPIENT_NAME: z.string().min(1).default('Equipe'),
  MARKETING_REMINDER_TEMPLATE_KEY: z.string().min(1).default('marketing-reminder'),

  // ── Knobs dos workers (defaults sensatos; ver CLAUDE.md) ─────────────────────
  PUBLISHER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  PUBLISHER_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  PUBLISHER_CLAIM_LEASE_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60_000),
  REMINDER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  REMINDER_RETRY_BASE_MS: z.coerce.number().int().positive().default(60_000),
  REMINDER_RETRY_MAX_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 60_000),
  MEDIA_TRANSFER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  MEDIA_TRANSFER_BATCH_SIZE: z.coerce.number().int().positive().default(2),
  MEDIA_TRANSFER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  MEDIA_TRANSFER_LEASE_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 60_000),
  MEDIA_TRANSFER_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 60_000),
  TOKEN_REFRESH_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60_000),
  TOKEN_REFRESH_MARGIN_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(20 * 60_000),

  // ── YouTube (publisher automático — F2) ─────────────────────────────────────
  // Upload ANTECIPADO: publicações auto agendadas dentro do lead sobem privadas
  // com `status.publishAt` nativo (o YouTube publica sozinho no horário).
  YT_UPLOAD_LEAD_HOURS: z.coerce.number().int().positive().default(6),
  // Chunk do upload resumable — MÚLTIPLO de 256KB (exigência do protocolo).
  YT_UPLOAD_CHUNK_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(8 * 1024 * 1024)
    .refine((v) => v % 262_144 === 0, { message: 'deve ser múltiplo de 262144 (256KB)' }),
  // Orçamento diário (reset à meia-noite PT). `YT_VIDEOS_INSERT_UNITS=1600` é o
  // fail-safe p/ projetos no modelo antigo de quota; no modelo novo (insert = 1
  // unit, cap 100 uploads/dia) sete `=1` após conferir no console do Google.
  YT_QUOTA_BUDGET_UNITS: z.coerce.number().int().positive().default(9000),
  YT_VIDEOS_INSERT_UNITS: z.coerce.number().int().positive().default(1600),
  YT_UPLOAD_DAILY_CAP: z.coerce.number().int().positive().default(20),
  // Métricas básicas YT (snapshots de canal/publicações).
  YT_METRICS_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(6 * 60 * 60 * 1000),
  YT_METRICS_MAX_AGE_DAYS: z.coerce.number().int().positive().default(90),
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

/** Config do OAuth Google completa ou null (feature desligada — rotas 503). */
export function googleConfig(env: Env): {
  clientId: string
  clientSecret: string
  encKeyBase64: string
  /** Origem pública do gateway — a redirect_uri é SEMPRE derivada daqui (nunca de header). */
  redirectBaseUrl: string
  /** URL do app (destino dos 302 do callback). */
  appUrl: string
} | null {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.MARKETING_TOKEN_ENC_KEY ||
    !env.OAUTH_PUBLIC_BASE_URL ||
    !env.MARKETING_APP_URL
  ) {
    return null
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    encKeyBase64: env.MARKETING_TOKEN_ENC_KEY,
    redirectBaseUrl: env.OAUTH_PUBLIC_BASE_URL.replace(/\/$/, ''),
    appUrl: env.MARKETING_APP_URL.replace(/\/$/, ''),
  }
}

/** Config do lembrete (consumer HMAC do messaging) ou null (lembrete desligado). */
export function reminderConfig(env: Env): {
  gatewayUrl: string
  consumerId: string
  hmacSecret: string
  phones: string[]
  recipientName: string
  templateKey: string
} | null {
  if (!env.MARKETING_HMAC_SECRET) return null
  const phones = (env.MARKETING_REMINDER_PHONES ?? '')
    .split(',')
    .map((p) => p.trim().replace(/\D/g, ''))
    .filter((p) => p.length >= 10)
  return {
    gatewayUrl: env.GATEWAY_URL.replace(/\/$/, ''),
    consumerId: env.MARKETING_CONSUMER_ID,
    hmacSecret: env.MARKETING_HMAC_SECRET,
    phones,
    recipientName: env.MARKETING_REMINDER_RECIPIENT_NAME,
    templateKey: env.MARKETING_REMINDER_TEMPLATE_KEY,
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
