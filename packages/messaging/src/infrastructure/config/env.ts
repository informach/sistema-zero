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

const optionalSecret = (name: string, minLength = 16) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.length === 0 ? undefined : v))
    .refine((v) => v === undefined || v.length >= minLength, {
      message: `${name} deve ter pelo menos ${minLength} caracteres`,
    })

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3006),
    // `::` = dual-stack (IPv4+IPv6) — necessário p/ o private networking do
    // Railway (`messaging.railway.internal` resolve IPv6). Espelha o payments.
    HOST: z.string().min(1).default('::'),
    // Teto do corpo da requisição (bytes) — anti-DoS. 64 KB.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),
    // Teto MAIOR só p/ as rotas de webhook de status: a SendGrid posta eventos em
    // LOTES de até 768 KB (doc oficial) — 64 KB derrubaria o lote inteiro (413 em
    // loop = bounces/delivered perdidos). 2 MB dá folga.
    WEBHOOK_MAX_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(2 * 1024 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // Rotas admin (`/messaging/admin/*`): confere os headers `X-Auth-User-*` que o
    // gateway injeta (defesa em profundidade). Seguro por default; desligue só em dev
    // quando bater no serviço SEM passar pelo gateway.
    REQUIRE_ADMIN: optionalBool(true),
    // Token interno injetado pelo gateway nas rotas de envio (S2S), espelhando o
    // padrão do members. Quando AUSENTE/vazio, a checagem é desligada (dev).
    MESSAGING_INTERNAL_TOKEN: optionalSecret('MESSAGING_INTERNAL_TOKEN'),

    // ── Provedores (opcionais no boot; o worker falha o envio se faltar) ────────
    SENDGRID_API_KEY: z.string().optional(),
    SENDGRID_WEBHOOK_PUBLIC_KEY: z.string().optional(),
    EVOLUTION_URL: z.string().url().optional(),
    EVOLUTION_API_KEY: z.string().optional(),
    // Destinatário dos ALERTAS operacionais (ex.: WhatsApp/instância desconectou). Vazio
    // = só loga (Sentry via espelho de ERROR); setado = também manda e-mail de aviso.
    ALERT_EMAIL: z.string().email().optional(),
    // Segredo `?token=` exigido nos webhooks de status (defesa extra). Ausente = desligado
    // (só em dev — em produção é OBRIGATÓRIO, ver refines no fim).
    MESSAGING_WEBHOOK_TOKEN: optionalSecret('MESSAGING_WEBHOOK_TOKEN'),
    // Janela de tolerância do timestamp assinado do webhook do SendGrid (anti-replay).
    WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(600),

    // ── Outbox / workers ────────────────────────────────────────────────────────
    OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
    OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(100),
    OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
    PG_LISTEN_ENABLED: optionalBool(true),
    SEND_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(3000),
    SEND_BATCH_SIZE: z.coerce.number().int().positive().default(50),
    MAX_SEND_ATTEMPTS: z.coerce.number().int().positive().default(5),
    // Lease do claim de envio: mensagem reivindicada (SENDING) volta a ser elegível
    // depois disto (reaper — recupera crash/erro entre o claim e o update). Deve ser
    // MAIOR que o pior caso claim→update (lote de e-mail sequencial + timeout do provedor).
    SEND_CLAIM_LEASE_MS: z.coerce.number().int().positive().default(600_000),
    CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
    RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    // Retenção da tabela `messages` (terminais): o rendered_body (~6KB/linha)
    // cresceria p/ sempre sem expurgo. Janela maior que a do outbox (auditoria).
    MESSAGES_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
    // Token do GET /metrics (header x-metrics-token ou Bearer). Obrigatório em
    // produção (refine) — espelha o payments.
    METRICS_TOKEN: optionalSecret('METRICS_TOKEN'),
    // Sentry (erros). Ausente = desligado (no-op) — espelha o payments.
    SENTRY_DSN: z.string().url().optional(),

    // ── E-mail: throttle de envio ───────────────────────────────────────────────
    EMAIL_RATE_PER_SEC: z.coerce.number().int().positive().default(5),

    // ── E-mail: anexos por URL (o worker busca os bytes no envio) ───────────────
    // Teto por anexo (content-length E tamanho real lido). Default 5MB.
    ATTACHMENT_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(5 * 1024 * 1024),
    // Allowlist de hostnames (CSV) p/ o fetch de anexos — anti-SSRF. VAZIA = dev
    // liberado; quando setada, só os hosts listados (em prod: fiscal.railway.internal).
    ATTACHMENT_FETCH_ALLOWED_HOSTS: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? '')
          .split(',')
          .map((h) => h.trim().toLowerCase())
          .filter((h) => h.length > 0),
      ),

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
  // ── Fail-closed em produção (espelha o payments): segurança não é opt-in ─────
  .refine((e) => !(e.NODE_ENV === 'production' && !e.MESSAGING_INTERNAL_TOKEN), {
    message:
      'Em produção MESSAGING_INTERNAL_TOKEN é obrigatório (sem ele as rotas de envio ficam abertas)',
    path: ['MESSAGING_INTERNAL_TOKEN'],
  })
  .refine((e) => !(e.NODE_ENV === 'production' && !e.MESSAGING_WEBHOOK_TOKEN), {
    message:
      'Em produção MESSAGING_WEBHOOK_TOKEN é obrigatório (webhook da Evolution é público; sem token = status forjável)',
    path: ['MESSAGING_WEBHOOK_TOKEN'],
  })
  .refine((e) => !(e.NODE_ENV === 'production' && !e.REQUIRE_ADMIN), {
    message: 'Em produção REQUIRE_ADMIN não pode ser desligado (defesa em profundidade do admin)',
    path: ['REQUIRE_ADMIN'],
  })
  .refine(
    (e) => !(e.NODE_ENV === 'production' && e.SENDGRID_API_KEY && !e.SENDGRID_WEBHOOK_PUBLIC_KEY),
    {
      message:
        'Em produção com SENDGRID_API_KEY, SENDGRID_WEBHOOK_PUBLIC_KEY é obrigatória (bounce forjado suprime destinatários)',
      path: ['SENDGRID_WEBHOOK_PUBLIC_KEY'],
    },
  )
  .refine((e) => !(e.NODE_ENV === 'production' && !e.METRICS_TOKEN), {
    message: 'Em produção METRICS_TOKEN (≥16 chars) é obrigatório — /metrics não fica aberto',
    path: ['METRICS_TOKEN'],
  })
  .refine((e) => !(e.NODE_ENV === 'production' && e.ATTACHMENT_FETCH_ALLOWED_HOSTS.length === 0), {
    message:
      'Em produção ATTACHMENT_FETCH_ALLOWED_HOSTS é obrigatório (anti-SSRF para anexos por URL)',
    path: ['ATTACHMENT_FETCH_ALLOWED_HOSTS'],
  })
  // EVOLUTION_URL e EVOLUTION_API_KEY andam em PAR: um sem o outro = envio de
  // WhatsApp falhando em silêncio até esgotar tentativas.
  .refine((e) => !e.EVOLUTION_URL === !e.EVOLUTION_API_KEY, {
    message: 'EVOLUTION_URL e EVOLUTION_API_KEY devem ser definidas juntas (ou nenhuma)',
    path: ['EVOLUTION_API_KEY'],
  })
  .refine((e) => e.WEBHOOK_MAX_BODY_BYTES >= e.MAX_REQUEST_BODY_BYTES, {
    message: 'WEBHOOK_MAX_BODY_BYTES deve ser >= MAX_REQUEST_BODY_BYTES',
    path: ['WEBHOOK_MAX_BODY_BYTES'],
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
