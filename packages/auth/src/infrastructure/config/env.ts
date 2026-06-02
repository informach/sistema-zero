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
    PORT: z.coerce.number().int().positive().default(3002),
    // Teto do corpo da requisição (bytes) — cadastros/login são pequenos. 16 KB.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(16 * 1024),
    TRUST_PROXY: optionalBool(false),
    TRUSTED_PROXY_HOPS: z.coerce.number().int().positive().default(1),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // JWT
    JWT_ALG: z.enum(['HS256', 'RS256']).default('HS256'),
    JWT_ISSUER: z.string().min(1).default('sistemazero-auth'),
    JWT_AUDIENCE: z.string().min(1).default('sistemazero'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    // HS256 (segredo simétrico — compartilhado com o gateway).
    JWT_HS256_SECRET: z.string().optional(),
    // RS256 (par de chaves). PEM com `\n` literais é normalizado no carregador de chaves.
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().optional(),
    JWT_KID: z.string().min(1).default('auth-key-1'),

    PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).default(10),
  })
  // HS256 exige um segredo forte (≥ 32 chars) — um segredo curto/ausente derrubaria
  // toda a garantia de autenticidade dos tokens. Fail-fast no boot.
  .refine((e) => e.JWT_ALG !== 'HS256' || (e.JWT_HS256_SECRET?.length ?? 0) >= 32, {
    message:
      'JWT_HS256_SECRET é obrigatório e deve ter ao menos 32 caracteres quando JWT_ALG=HS256',
    path: ['JWT_HS256_SECRET'],
  })
  // RS256 em produção exige a chave privada (em dev, geramos um par efêmero).
  .refine(
    (e) =>
      e.JWT_ALG !== 'RS256' || e.NODE_ENV !== 'production' || Boolean(e.JWT_PRIVATE_KEY?.trim()),
    {
      message: 'JWT_PRIVATE_KEY (PKCS#8 PEM) é obrigatória em produção quando JWT_ALG=RS256',
      path: ['JWT_PRIVATE_KEY'],
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
