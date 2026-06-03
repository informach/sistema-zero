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
    PORT: z.coerce.number().int().positive().default(3004),
    // Conteúdo de aula (blocos) pode ser maior que um login — 64 KB.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // Catálogo (S2S direto na rede interna; rota de entitlements é pública de leitura).
    CATALOG_BASE_URL: z.string().url().default('http://localhost:3003'),

    // Verificação dos webhooks de entrada. O gateway re-assina (resign) a chamada do
    // funil como consumer `gateway` usando ESTE segredo (= GATEWAY_HMAC_SECRET do gateway).
    GATEWAY_HMAC_SECRET: z.string().min(16, 'GATEWAY_HMAC_SECRET deve ter ao menos 16 caracteres'),
    HMAC_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),

    // Defesa em profundidade da API do ALUNO: o gateway injeta `x-internal-token` com
    // ESTE valor (header-inject) e o members o exige nas rotas do aluno — garante que a
    // chamada veio do gateway (o `x-auth-user-id` confiável só vale se passou por ele).
    // Opcional em dev/local (sem gateway); OBRIGATÓRIO em produção (ver refine abaixo).
    INTERNAL_API_TOKEN: z
      .string()
      .min(16, 'INTERNAL_API_TOKEN deve ter ao menos 16 caracteres')
      .optional(),

    // Carência (dias) somada ao fim do ciclo da assinatura ao calcular `expiresAt`.
    SUBSCRIPTION_GRACE_DAYS: z.coerce.number().int().nonnegative().default(3),

    // RBAC das rotas admin (`/members/admin/*`). O gateway aplica o RBAC real (JWT +
    // role); o serviço confere os headers X-Auth-User-* (defesa em profundidade).
    // Em dev, fora do gateway, pode-se desligar a checagem.
    REQUIRE_ADMIN: optionalBool(true),
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.INTERNAL_API_TOKEN), {
    message:
      'INTERNAL_API_TOKEN é obrigatório em produção (defesa em profundidade da API do aluno)',
    path: ['INTERNAL_API_TOKEN'],
  })

export type Env = z.infer<typeof EnvSchema>

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
