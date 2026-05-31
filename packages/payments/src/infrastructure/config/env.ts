import { z } from 'zod'

/**
 * Booleano a partir de string de ambiente, com default. Aceita apenas
 * `true/false/1/0` (case-insensitive) — valores inválidos FALHAM no boot em vez
 * de virarem `false` silenciosamente.
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
  PORT: z.coerce.number().int().positive().default(3001),
  HMAC_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
  TRUST_PROXY: optionalBool(false),
  // Nº de proxies confiáveis na frente do app (resolve o IP do cliente como a
  // N-ésima entrada do X-Forwarded-For a partir da direita). Só vale com TRUST_PROXY.
  TRUSTED_PROXY_HOPS: z.coerce.number().int().positive().default(1),
  // Teto do corpo da requisição (bytes) — anti-DoS por payload gigante. 64 KB.
  MAX_REQUEST_BODY_BYTES: z.coerce.number().int().positive().default(64 * 1024),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  EFI_CLIENT_ID: z.string().min(1, 'EFI_CLIENT_ID é obrigatória'),
  EFI_CLIENT_SECRET: z.string().min(1, 'EFI_CLIENT_SECRET é obrigatória'),
  EFI_SANDBOX: optionalBool(true),
  // Certificado P12 da Efí: por caminho de arquivo OU por conteúdo em base64
  // (preferível em PaaS como Railway, que não têm upload de arquivo persistente).
  EFI_CERTIFICATE_PATH: z.string().optional(),
  EFI_CERTIFICATE_BASE64: z.string().optional(),
  EFI_PIX_KEY: z.string().min(1, 'EFI_PIX_KEY é obrigatória'),
  EFI_WEBHOOK_SECRET: z.string().optional(),
  // Timeout por requisição HTTP à Efí (ms) — aborta sockets pendurados (mTLS/Bun).
  EFI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  // Após N falhas de publicação, o evento vira DEAD (sai da fila → não bloqueia).
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),

  // Escala / resiliência
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  // LISTEN/NOTIFY acorda os workers na hora (latência ~ms). Desligue (false) atrás
  // de PgBouncer em modo transaction/statement pooling (não suporta LISTEN) — o
  // poll periódico continua processando normalmente.
  PG_LISTEN_ENABLED: optionalBool(true),
  IDEMPOTENCY_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),

  // Criação de cobrança assíncrona (opt-in para picos de lançamento)
  ASYNC_CHARGE_CREATION: optionalBool(false),
  CHARGE_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  CHARGE_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  CHARGE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  CHARGE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  // Tempo (ms) até um claim "preso" voltar à fila p/ nova tentativa (lease).
  CHARGE_CLAIM_STALE_MS: z.coerce.number().int().positive().default(60_000),

  // Reconciliação
  RECONCILE_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  RECONCILE_BATCH_SIZE: z.coerce.number().int().positive().default(50),

  // Entrega de webhook de saída (notificar consumidores)
  WEBHOOK_DELIVERY_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  WEBHOOK_DELIVERY_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  WEBHOOK_DELIVERY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(8),
  // Entregas em paralelo por ciclo (lote cabe no lease → evita re-entrega).
  WEBHOOK_DELIVERY_CONCURRENCY: z.coerce.number().int().positive().default(5),
}).refine(
  (e) => Boolean(e.EFI_CERTIFICATE_PATH?.trim() || e.EFI_CERTIFICATE_BASE64?.trim()),
  {
    message: 'Defina EFI_CERTIFICATE_PATH ou EFI_CERTIFICATE_BASE64 (certificado P12 da Efí)',
    path: ['EFI_CERTIFICATE_PATH'],
  },
)

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
