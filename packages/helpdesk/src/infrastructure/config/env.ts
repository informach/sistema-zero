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
  PORT: z.coerce.number().int().positive().default(3013),
  // `::` (default) é dual-stack (IPv4 + IPv6) — obrigatório para o private
  // networking do Railway (`helpdesk.railway.internal` resolve IPv6).
  HOST: z.string().min(1).default('::'),
  // Corpos de e-mail/rascunhos em texto — 512 KB cobre com folga.
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

  // Defesa em profundidade: o gateway injeta `x-internal-token` com ESTE valor e
  // o helpdesk o exige em TODAS as rotas de negócio.
  INTERNAL_API_TOKEN: z.string().min(16, 'INTERNAL_API_TOKEN deve ter ao menos 16 caracteres'),

  // RBAC (staff+) conferido nos X-Auth-User-* (o RBAC real é do gateway; defesa
  // em profundidade). Em dev sem gateway pode-se desligar.
  REQUIRE_STAFF: optionalBool(true),

  // ── OAuth Google (Gmail) — grupo ATÔMICO: qualquer um ausente → rotas de
  // conexão/envio respondem 503 GMAIL_NOT_CONFIGURED (boot nunca quebra) ───────
  // ⚠️ Client OAuth PRÓPRIO (separado do marketing), consent screen INTERNAL na
  // org Workspace — app External em Testing expira o refresh token em 7 dias.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Chave da secret-box (32 bytes em base64) — tokens NUNCA em claro no banco.
  HELPDESK_TOKEN_ENC_KEY: z
    .string()
    .optional()
    .refine((v) => v === undefined || Buffer.from(v, 'base64').length === 32, {
      message: 'deve ser 32 bytes em base64',
    }),
  // Origem PÚBLICA do gateway (monta a redirect_uri fixa do callback OAuth).
  OAUTH_PUBLIC_BASE_URL: z.string().url().optional(),
  // URL do helpdesk-app (destino do 302 pós-callback: /configuracoes?connected=…).
  HELPDESK_APP_URL: z.string().url().optional(),
  OAUTH_STATE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  // Nome de exibição no From das respostas (`From: <nome> <contato@…>`).
  HELPDESK_FROM_NAME: z.string().min(1).default('Sistema Zero'),
  // O serviço atende uma única caixa compartilhada. O callback OAuth confere o
  // e-mail retornado por `users.getProfile` antes de persistir credenciais.
  HELPDESK_MAILBOX_ADDRESS: z
    .string()
    .trim()
    .toLowerCase()
    .email('HELPDESK_MAILBOX_ADDRESS deve ser um e-mail válido')
    .default('contato@sistemazero.com.br'),

  // ── Sync do Gmail (gmail-sync-worker) ────────────────────────────────────────
  GMAIL_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(45_000),
  GMAIL_SYNC_LEASE_MS: z.coerce.number().int().positive().default(120_000),
  GMAIL_SYNC_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  // Janela do backfill inicial (query do Gmail) — só na 1ª conexão/reset.
  GMAIL_BACKFILL_QUERY: z.string().min(1).default('newer_than:7d'),
  GMAIL_FETCH_BATCH_SIZE: z.coerce.number().int().positive().default(25),
  // Refresh lazy do access token com esta folga (o poller mantém tudo fresco).
  TOKEN_REFRESH_MARGIN_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 60_000),

  // ── IA via OpenRouter — fail-soft: ausente → tickets sem IA (ai_status
  // `skipped`), tudo mais funciona ─────────────────────────────────────────────
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_HELPDESK_MODEL: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  OPENROUTER_REFERER: z.string().url().optional(),
  AI_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  AI_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  // Clamp da thread no prompt (caracteres) — e-mails longos não estouram contexto.
  AI_MAX_THREAD_CHARS: z.coerce.number().int().positive().default(24_000),

  // Retenção e limpeza periódica (oauth_states vencidos).
  RETENTION_CLEANUP_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(6 * 60 * 60 * 1000),
})

export type Env = z.infer<typeof EnvSchema>

/**
 * Config COMUM da integração Gmail: secret-box + URLs de redirect + client
 * Google. Grupo ATÔMICO — incompleto = null (rotas 503, boot ok).
 */
export function gmailConfig(env: Env): {
  clientId: string
  clientSecret: string
  encKeyBase64: string
  /** Origem pública do gateway — a redirect_uri é SEMPRE derivada daqui (nunca de header). */
  redirectBaseUrl: string
  /** URL do app (destino dos 302 do callback). */
  appUrl: string
  /** Caixa única autorizada para a fila de atendimento. */
  mailboxAddress: string
} | null {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.HELPDESK_TOKEN_ENC_KEY ||
    !env.OAUTH_PUBLIC_BASE_URL ||
    !env.HELPDESK_APP_URL
  ) {
    return null
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    encKeyBase64: env.HELPDESK_TOKEN_ENC_KEY,
    redirectBaseUrl: env.OAUTH_PUBLIC_BASE_URL.replace(/\/$/, ''),
    appUrl: env.HELPDESK_APP_URL.replace(/\/$/, ''),
    mailboxAddress: env.HELPDESK_MAILBOX_ADDRESS,
  }
}

/** Config da IA ou null (feature desligada — tickets seguem sem IA). */
export function aiConfig(env: Env): {
  apiKey: string
  model: string
  referer: string | null
} | null {
  const model = env.OPENROUTER_HELPDESK_MODEL ?? env.OPENROUTER_MODEL
  if (!env.OPENROUTER_API_KEY || !model) return null
  return { apiKey: env.OPENROUTER_API_KEY, model, referer: env.OPENROUTER_REFERER ?? null }
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
