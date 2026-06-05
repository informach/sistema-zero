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
    // Endereço de bind. `::` (default) é dual-stack (IPv4 + IPv6) — obrigatório
    // para o private networking do Railway (`members.railway.internal` resolve
    // IPv6; um bind `0.0.0.0` fica inalcançável). Espelha o payments.
    HOST: z.string().min(1).default('::'),
    // Conteúdo de aula (blocos) pode ser maior que um login — 64 KB.
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

    // Catálogo (S2S direto na rede interna). A rota de entitlements expõe o
    // manifesto de entrega e exige o `x-internal-token` do catalog (06/2026).
    CATALOG_BASE_URL: z.string().url().default('http://localhost:3003'),
    // Timeout por chamada ao catálogo (resolve da oferta no grant). Sem ele, um
    // catálogo travado penduraria o handler do webhook (conexões acumulando).
    CATALOG_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    // Token interno enviado na chamada S2S de entitlements (= INTERNAL_API_TOKEN do
    // catalog e CATALOG_INTERNAL_TOKEN do gateway). Opcional em dev/local (catálogo
    // sem token); OBRIGATÓRIO em produção (ver refine abaixo) — sem ele o grant
    // levaria 401 do catálogo em runtime.
    CATALOG_INTERNAL_TOKEN: z
      .string()
      .min(16, 'CATALOG_INTERNAL_TOKEN deve ter ao menos 16 caracteres')
      .optional(),

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

    // Retenção do dedupe de webhooks (`processed_webhooks`): linhas mais antigas
    // que isto são apagadas pelo ciclo periódico de limpeza (fora do hot path;
    // advisory lock garante 1 réplica por ciclo). Reprocessar entrega antiga é
    // inócuo (grant/revoke idempotentes) — a tabela só não pode crescer sem fim.
    PROCESSED_WEBHOOKS_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    RETENTION_CLEANUP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(6 * 60 * 60 * 1000),

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
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.CATALOG_INTERNAL_TOKEN), {
    message:
      'CATALOG_INTERNAL_TOKEN é obrigatório em produção (o catálogo exige o token na rota S2S de entitlements)',
    path: ['CATALOG_INTERNAL_TOKEN'],
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
