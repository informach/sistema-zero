import { z } from 'zod'

const EnvSchema = z.object({
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

  // Carência (dias) somada ao fim do ciclo da assinatura ao calcular `expiresAt`.
  SUBSCRIPTION_GRACE_DAYS: z.coerce.number().int().nonnegative().default(3),
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
