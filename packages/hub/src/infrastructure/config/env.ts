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

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3010),
    // `::` (default) é dual-stack (IPv4 + IPv6) — obrigatório para o private
    // networking do Railway (`hub.railway.internal` resolve IPv6).
    HOST: z.string().min(1).default('::'),
    // Tópicos/comentários em Markdown podem ser maiores que um login — 64 KB.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // Sentry. Ausente = desligado (dev/local).
    SENTRY_DSN: z.string().url().optional(),

    // ── Members (S2S direto na rede interna): resolve acesso por matrícula ──────
    MEMBERS_BASE_URL: z.string().url().default('http://localhost:3004'),
    MEMBERS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
    // Token interno enviado na chamada S2S de access-check (= INTERNAL_API_TOKEN do
    // members). Opcional em dev; OBRIGATÓRIO em produção (refine abaixo).
    MEMBERS_INTERNAL_TOKEN: z
      .string()
      .min(16, 'MEMBERS_INTERNAL_TOKEN deve ter ao menos 16 caracteres')
      .optional(),
    // TTL do micro-cache de acesso (userId, spaceId). Ausente → 30s em prod, 0 fora.
    ACCESS_CACHE_TTL_MS: z.coerce.number().int().nonnegative().optional(),

    // Verificação dos webhooks de entrada (o gateway re-assina como consumer `gateway`).
    GATEWAY_HMAC_SECRET: z.string().min(16, 'GATEWAY_HMAC_SECRET deve ter ao menos 16 caracteres'),
    HMAC_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),

    // Defesa em profundidade: o gateway injeta `x-internal-token` com ESTE valor e o
    // hub o exige nas rotas do aluno e admin. Obrigatório também fora de produção:
    // sem ele a app subiria, mas toda rota protegida retornaria 401.
    INTERNAL_API_TOKEN: z.string().min(16, 'INTERNAL_API_TOKEN deve ter ao menos 16 caracteres'),

    // RBAC das rotas admin (`/hub/admin/*`). O gateway aplica o RBAC real; o serviço
    // confere os X-Auth-User-* (defesa em profundidade). Em dev pode-se desligar.
    REQUIRE_ADMIN: optionalBool(true),

    // ── Limites de anexo (validados no `confirm` por HEAD; o presign do BFF aplica
    // os mesmos). Bytes por tipo + nº máximo por post. ──────────────────────────
    ATTACHMENT_MAX_IMAGE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(10 * 1024 * 1024),
    ATTACHMENT_MAX_PDF_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(25 * 1024 * 1024),
    ATTACHMENT_MAX_DOCUMENT_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(25 * 1024 * 1024),
    ATTACHMENT_MAX_AUDIO_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(25 * 1024 * 1024),
    ATTACHMENT_MAX_VIDEO_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(200 * 1024 * 1024),
    ATTACHMENT_MAX_PER_POST: z.coerce.number().int().positive().default(10),

    // Retenção do dedupe de webhooks (`processed_webhooks`).
    PROCESSED_WEBHOOKS_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    RETENTION_CLEANUP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(6 * 60 * 60 * 1000),
    // Anexos `pending_upload` nunca vinculados (upload abandonado) são podados após
    // estas horas — limpa a tabela; o objeto no R2 é coletado pelo BFF (dono do bucket).
    ATTACHMENT_ORPHAN_RETENTION_HOURS: z.coerce.number().int().positive().default(24),
    // Slugs (CSV) dos servidores que SÃO paredes de vitrine — o destino da
    // auto-publicação do Mural é restrito a eles (não basta ser kids + staff_only).
    SHOWCASE_WALL_SLUGS: z.string().default('mural-dos-criadores'),
    // Canal dentro do servidor de vitrine que recebe os posts auto-publicados.
    SHOWCASE_WALL_CHANNEL_SLUG: z.string().min(1).default('parede'),
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.MEMBERS_INTERNAL_TOKEN), {
    message:
      'MEMBERS_INTERNAL_TOKEN é obrigatório em produção (o members exige o token na rota S2S de access-check)',
    path: ['MEMBERS_INTERNAL_TOKEN'],
  })

export type Env = z.infer<typeof EnvSchema>

/** Conjunto de slugs de parede de vitrine (CSV → Set, vazios descartados). */
export function showcaseWallSlugs(env: Env): Set<string> {
  return new Set(
    env.SHOWCASE_WALL_SLUGS.split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  )
}

/** Canal dentro do servidor de vitrine que recebe posts auto-publicados. */
export function showcaseWallChannelSlug(env: Env): string {
  return env.SHOWCASE_WALL_CHANNEL_SLUG.trim()
}

/** TTL efetivo do micro-cache de acesso (default: 30s em prod, 0 fora). */
export function accessCacheTtlMs(env: Env): number {
  if (env.ACCESS_CACHE_TTL_MS !== undefined) return env.ACCESS_CACHE_TTL_MS
  return env.NODE_ENV === 'production' ? 30_000 : 0
}

/** Limites de anexo (bytes por tipo + nº máx por post) derivados do env. */
export function attachmentLimits(env: Env): {
  maxBytesByKind: Record<'image' | 'pdf' | 'document' | 'audio' | 'video', number>
  maxPerPost: number
} {
  return {
    maxBytesByKind: {
      image: env.ATTACHMENT_MAX_IMAGE_BYTES,
      pdf: env.ATTACHMENT_MAX_PDF_BYTES,
      document: env.ATTACHMENT_MAX_DOCUMENT_BYTES,
      audio: env.ATTACHMENT_MAX_AUDIO_BYTES,
      video: env.ATTACHMENT_MAX_VIDEO_BYTES,
    },
    maxPerPost: env.ATTACHMENT_MAX_PER_POST,
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
