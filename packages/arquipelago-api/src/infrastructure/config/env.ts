import { resolve } from 'node:path'
import { z } from 'zod'

const BOOL_VALUES = new Set(['true', 'false', '1', '0'])

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
  )

/** Onde o `bun run build` do pacote do jogo deixa o cliente (manifesto + arquivos com hash). */
const CLIENTE_PADRAO = resolve(import.meta.dir, '../../../../arquipelago/dist/cliente')

/**
 * Env do serviço do jogo. Fail-fast no boot (padrão do monorepo). Quem vê o jogo é decidido
 * aqui, sem deploy da plataforma: `ARQUIPELAGO_MODO` (desligado, lista ou aberto),
 * `ARQUIPELAGO_PUBLICOS` (kids, adulto) e `ARQUIPELAGO_LISTA` (ids de perfil ou de conta).
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Distingue prod de staging no Railway (ambos rodam NODE_ENV=production). */
    APP_ENV: z.enum(['staging', 'production']).optional(),
    PORT: z.coerce.number().int().positive().default(3015),
    HOST: z.string().min(1).default('::'),
    /** O salvamento tem teto de 64 KB; o corpo inteiro (com a revisão) fica abaixo disto. */
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(96 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // ── Quem vê o jogo ───────────────────────────────────────────────────────
    /** Sem valor: aberto no desenvolvimento e DESLIGADO em deploy (lançar é decisão explícita). */
    ARQUIPELAGO_MODO: z.enum(['desligado', 'lista', 'aberto']).optional(),
    ARQUIPELAGO_PUBLICOS: csv.pipe(z.array(z.enum(['kids', 'adulto']))),
    /** Ids de perfil (Kids) ou de conta liberados no modo `lista`. A equipe sempre entra. */
    ARQUIPELAGO_LISTA: csv,

    // ── Cliente do jogo ──────────────────────────────────────────────────────
    ARQUIPELAGO_CLIENTE_DIR: z.string().min(1).default(CLIENTE_PADRAO),
    /** Mapas de código do cliente: úteis em staging, fora em produção por padrão. */
    ARQUIPELAGO_SERVIR_MAPAS: z
      .string()
      .optional()
      .refine((v) => v === undefined || BOOL_VALUES.has(v.toLowerCase()), {
        message: "deve ser 'true', 'false', '1' ou '0'",
      }),

    // ── Borda própria ────────────────────────────────────────────────────────
    /** Prova de origem do gateway (header-inject) nas rotas /arquipelago/*. */
    INTERNAL_API_TOKEN: z.string().min(16).optional(),
    SENTRY_DSN: z.string().url().optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.APP_ENV), {
    message: 'APP_ENV (staging|production) é obrigatório quando NODE_ENV=production',
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.INTERNAL_API_TOKEN), {
    message: 'Em produção é obrigatório: INTERNAL_API_TOKEN',
  })
  .transform((env) => ({
    ...env,
    ARQUIPELAGO_MODO:
      env.ARQUIPELAGO_MODO ?? (env.NODE_ENV === 'production' ? 'desligado' : 'aberto'),
    ARQUIPELAGO_PUBLICOS:
      env.ARQUIPELAGO_PUBLICOS.length > 0 ? env.ARQUIPELAGO_PUBLICOS : (['kids'] as const),
    ARQUIPELAGO_SERVIR_MAPAS:
      env.ARQUIPELAGO_SERVIR_MAPAS === undefined
        ? env.APP_ENV !== 'production'
        : ['true', '1'].includes(env.ARQUIPELAGO_SERVIR_MAPAS.toLowerCase()),
  }))

export type Env = z.infer<typeof EnvSchema>

export function loadEnv(overrides: Record<string, string | undefined> = {}): Env {
  const parsed = EnvSchema.safeParse({ ...process.env, ...overrides })
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.') || '(env)'}: ${i.message}`)
    throw new Error(`Configuração inválida:\n${issues.join('\n')}`)
  }
  return parsed.data
}
