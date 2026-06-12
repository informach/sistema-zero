import { z } from 'zod'

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
 * Env do serviço fiscal. O CORAÇÃO do requisito "nota real só em produção" são
 * os refines APP_ENV × NFSE_AMBIENTE: produção exige `producao`, staging exige
 * `producao-restrita` (homologação do governo — nota SEM validade jurídica), e
 * em desenvolvimento `producao` é RECUSADO. Qualquer cruzamento = boot falha.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Distingue prod de staging no Railway (ambos rodam NODE_ENV=production). */
    APP_ENV: z.enum(['staging', 'production']).optional(),
    PORT: z.coerce.number().int().positive().default(3009),
    HOST: z.string().min(1).default('::'),
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // ── Sefin Nacional ────────────────────────────────────────────────────────
    NFSE_AMBIENTE: z.enum(['producao', 'producao-restrita']).default('producao-restrita'),
    /** Certificado A1 (.pfx) — base64 no host (Railway) ou caminho local (dev). */
    NFSE_CERT_PFX_BASE64: z.string().optional(),
    NFSE_CERT_PFX_PATH: z.string().optional(),
    NFSE_CERT_PASSWORD: z.string().optional(),
    NFSE_CERT_WARN_DAYS: z.coerce.number().int().positive().default(30),
    /** Série PRÓPRIA do sistema (Emissor Web usa a dele) — validada no spike. */
    NFSE_DPS_SERIE: z
      .string()
      .regex(/^\d{1,5}$/, 'série numérica de até 5 dígitos')
      .default('2'),
    /** Lei 12.741 (forma simplificada do Simples): alíquota efetiva, configurável. */
    NFSE_PTOTTRIB_SN: z
      .string()
      .regex(/^\d{1,2}\.\d{2}$/, 'percentual no formato 8.24')
      .default('8.24'),
    /** Código de tributação municipal (BH) — aceito na Produção Restrita. */
    NFSE_CTRIB_MUN: z
      .string()
      .regex(/^\d{1,3}$/)
      .default('001'),
    /** Prefixo da discriminação do serviço ("<prefixo> - <produto>"). */
    NFSE_SERVICE_DESC_PREFIX: z.string().max(120).default('Treinamento on-line'),
    /** Inscrição Municipal do prestador — exigida por BH (E0116). */
    NFSE_IM: z
      .string()
      .regex(/^\d{1,15}$/, 'IM só com dígitos')
      .optional(),
    NFSE_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
    NFSE_TOTAL_RETRY_BUDGET_MS: z.coerce.number().int().positive().default(60_000),

    // ── Agendamento/worker ───────────────────────────────────────────────────
    /** Oferta sem garantia declarada → emite após N dias (CDC art. 49 = 7). */
    NFSE_DEFAULT_GUARANTEE_DAYS: z.coerce.number().int().nonnegative().default(7),
    /** Folga após o fim da garantia antes de emitir. */
    NFSE_EMIT_BUFFER_HOURS: z.coerce.number().int().nonnegative().default(12),
    NFSE_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
    NFSE_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(10),
    NFSE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
    /** Lease do claim — réplica só re-reivindica após a outra ter parado. */
    NFSE_CLAIM_STALE_MS: z.coerce.number().int().positive().default(120_000),
    NFSE_CANCEL_WINDOW_DAYS: z.coerce.number().int().positive().default(180),

    // ── Integrações S2S ──────────────────────────────────────────────────────
    PAYMENTS_BASE_URL: z.string().url().default('http://localhost:3001'),
    /** = INTERNAL_API_TOKEN do payments (rota interna de leitura). */
    PAYMENTS_INTERNAL_TOKEN: z.string().min(16).optional(),
    /** Secret HMAC do consumer `fiscal` no payments (webhooks de entrada). */
    PAYMENTS_WEBHOOK_HMAC_SECRET: z.string().min(16).optional(),
    PAYMENTS_WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
    CATALOG_BASE_URL: z.string().url().default('http://localhost:3003'),
    S2S_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    /** Gateway p/ o envio do e-mail da nota (consumer HMAC de borda `fiscal`). */
    GATEWAY_URL: z.string().url().optional(),
    FISCAL_HMAC_SECRET: z.string().min(16).optional(),
    /** URL DESTE serviço alcançável pelo messaging (capability-URL do anexo). */
    FISCAL_SELF_URL: z.string().url().default('http://localhost:3009'),

    // ── Borda própria ────────────────────────────────────────────────────────
    /** Prova de origem do gateway nas rotas admin (header-inject). */
    INTERNAL_API_TOKEN: z.string().min(16).optional(),
    REQUIRE_ADMIN: optionalBool(true),
    METRICS_TOKEN: z.string().min(16).optional(),
    SENTRY_DSN: z.string().url().optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.APP_ENV), {
    message: 'APP_ENV (staging|production) é obrigatório quando NODE_ENV=production',
  })
  .refine((env) => env.APP_ENV !== 'production' || env.NFSE_AMBIENTE === 'producao', {
    message: 'APP_ENV=production exige NFSE_AMBIENTE=producao (senão nenhuma nota real é emitida)',
  })
  .refine((env) => env.APP_ENV !== 'staging' || env.NFSE_AMBIENTE === 'producao-restrita', {
    message: 'APP_ENV=staging exige NFSE_AMBIENTE=producao-restrita (staging NÃO emite nota real)',
  })
  .refine((env) => env.NODE_ENV === 'production' || env.NFSE_AMBIENTE !== 'producao', {
    message: 'NFSE_AMBIENTE=producao é RECUSADO fora de NODE_ENV=production (nota real em dev!)',
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' || Boolean(env.NFSE_CERT_PFX_BASE64 || env.NFSE_CERT_PFX_PATH),
    {
      message:
        'Certificado A1 (NFSE_CERT_PFX_BASE64 ou NFSE_CERT_PFX_PATH) é obrigatório em produção',
    },
  )
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.NFSE_IM), {
    message: 'NFSE_IM (Inscrição Municipal) é obrigatória em produção (BH exige — E0116)',
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' ||
      Boolean(
        env.INTERNAL_API_TOKEN &&
          env.METRICS_TOKEN &&
          env.PAYMENTS_INTERNAL_TOKEN &&
          env.PAYMENTS_WEBHOOK_HMAC_SECRET,
      ),
    {
      message:
        'Em produção são obrigatórios: INTERNAL_API_TOKEN, METRICS_TOKEN, PAYMENTS_INTERNAL_TOKEN e PAYMENTS_WEBHOOK_HMAC_SECRET',
    },
  )
  .refine((env) => env.NFSE_CLAIM_STALE_MS >= 2 * env.NFSE_REQUEST_TIMEOUT_MS, {
    message:
      'NFSE_CLAIM_STALE_MS deve ser ≥ 2× NFSE_REQUEST_TIMEOUT_MS (réplica só re-reivindica depois que a outra parou)',
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
