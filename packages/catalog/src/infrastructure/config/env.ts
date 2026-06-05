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
    PORT: z.coerce.number().int().positive().default(3003),
    // Endereço de bind. `::` (default) é dual-stack (IPv4 + IPv6) — obrigatório
    // para o private networking do Railway (`catalog.railway.internal` resolve
    // IPv6; um bind `0.0.0.0` fica inalcançável). Espelha o payments/members.
    HOST: z.string().min(1).default('::'),
    // Teto do corpo da requisição (bytes) — cadastros de produto/oferta são pequenos. 64 KB.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // Defesa em profundidade: prova de origem nas rotas que confiam em headers
    // injetados (admin/escrita, redeem) e na rota S2S de entitlements. O gateway
    // injeta `x-internal-token` (header-inject) e o members o envia na chamada
    // direta — ambos com ESTE valor. Opcional em dev/local (sem gateway);
    // OBRIGATÓRIO em produção (ver refine abaixo).
    INTERNAL_API_TOKEN: z
      .string()
      .min(16, 'INTERNAL_API_TOKEN deve ter ao menos 16 caracteres')
      .optional(),

    // O RBAC real é aplicado no gateway (JWT + role). Este serviço confere o role
    // dos headers X-Auth-User-* (injetados pelo gateway) como defesa em profundidade.
    // Em dev, fora do gateway, pode-se desligar a checagem.
    REQUIRE_ADMIN: optionalBool(true),
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.INTERNAL_API_TOKEN), {
    message:
      'INTERNAL_API_TOKEN é obrigatório em produção (defesa em profundidade das rotas admin/S2S)',
    path: ['INTERNAL_API_TOKEN'],
  })
  // Fail-closed: a defesa em profundidade dos headers X-Auth-User-* não pode ser
  // desligada em produção (um typo de env não vira admin aberto).
  .refine((env) => env.NODE_ENV !== 'production' || env.REQUIRE_ADMIN, {
    message: 'REQUIRE_ADMIN não pode ser desligado em produção',
    path: ['REQUIRE_ADMIN'],
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
