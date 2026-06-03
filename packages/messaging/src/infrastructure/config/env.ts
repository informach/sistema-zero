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
    PORT: z.coerce.number().int().positive().default(3006),
    // Teto do corpo da requisição (bytes) — anti-DoS. 64 KB.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // Rotas admin (`/messaging/admin/*`): confere os headers `X-Auth-User-*` que o
    // gateway injeta (defesa em profundidade). Seguro por default; desligue só em dev
    // quando bater no serviço SEM passar pelo gateway.
    REQUIRE_ADMIN: optionalBool(true),
    // Token interno injetado pelo gateway nas rotas de envio (S2S), espelhando o
    // padrão do members. Quando AUSENTE/vazio, a checagem é desligada (dev).
    MESSAGING_INTERNAL_TOKEN: z.string().optional(),

    // ── Provedores (opcionais no boot; o worker falha o envio se faltar) ────────
    SENDGRID_API_KEY: z.string().optional(),
    SENDGRID_WEBHOOK_PUBLIC_KEY: z.string().optional(),
    EVOLUTION_URL: z.string().url().optional(),
    EVOLUTION_API_KEY: z.string().optional(),
    // Segredo `?token=` exigido nos webhooks de status (defesa extra). Ausente = desligado.
    MESSAGING_WEBHOOK_TOKEN: z
      .string()
      .min(1, 'MESSAGING_WEBHOOK_TOKEN não pode ser vazia; remova para desabilitar')
      .optional(),

    // ── Outbox / workers ────────────────────────────────────────────────────────
    OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
    OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(100),
    OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
    PG_LISTEN_ENABLED: optionalBool(true),
    SEND_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(3000),
    SEND_BATCH_SIZE: z.coerce.number().int().positive().default(50),
    MAX_SEND_ATTEMPTS: z.coerce.number().int().positive().default(5),
    CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
    RETENTION_DAYS: z.coerce.number().int().positive().default(30),

    // ── E-mail: throttle de envio ───────────────────────────────────────────────
    EMAIL_RATE_PER_SEC: z.coerce.number().int().positive().default(5),

    // ── WhatsApp: ritmo anti-ban (ver domain/services/pacing.ts) ────────────────
    WA_MIN_DELAY_MS: z.coerce.number().int().positive().default(15_000),
    WA_MAX_DELAY_MS: z.coerce.number().int().positive().default(45_000),
    WA_REST_AFTER_N: z.coerce.number().int().positive().default(50),
    WA_REST_DURATION_MS: z.coerce.number().int().positive().default(600_000),
    WA_WARMUP_DAYS: z.coerce.number().int().positive().default(10),
    WA_WARMUP_START_CAP: z.coerce.number().int().positive().default(20),
    // Reserva (lease) da lane entre o claim e a confirmação do envio (evita que
    // outro tick reuse o mesmo número enquanto a chamada ao provedor está em voo).
    WA_LANE_LEASE_MS: z.coerce.number().int().positive().default(60_000),
    // Backoff de re-tentativa (full jitter exponencial).
    SEND_RETRY_BASE_MS: z.coerce.number().int().positive().default(30_000),
    SEND_RETRY_MAX_MS: z.coerce.number().int().positive().default(3_600_000),
  })
  .refine((e) => e.WA_MAX_DELAY_MS >= e.WA_MIN_DELAY_MS, {
    message: 'WA_MAX_DELAY_MS deve ser >= WA_MIN_DELAY_MS',
    path: ['WA_MAX_DELAY_MS'],
  })

export type Env = z.infer<typeof EnvSchema>

/**
 * Valida e tipa as variáveis de ambiente no boot (fail-fast). Lança um erro
 * legível listando todos os problemas de uma vez.
 */
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
