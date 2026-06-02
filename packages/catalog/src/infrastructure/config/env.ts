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

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3003),
  // Teto do corpo da requisição (bytes) — cadastros de produto/oferta são pequenos. 64 KB.
  MAX_REQUEST_BODY_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(64 * 1024),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  // O RBAC real é aplicado no gateway (JWT + role). Este serviço confere o role
  // dos headers X-Auth-User-* (injetados pelo gateway) como defesa em profundidade.
  // Em dev, fora do gateway, pode-se desligar a checagem.
  REQUIRE_ADMIN: optionalBool(true),
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
