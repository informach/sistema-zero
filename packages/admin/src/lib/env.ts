import 'server-only'
import { z } from 'zod'

/**
 * Env do servidor (fail-fast). NUNCA é importado por Client Component — `server-only`
 * garante o erro de build se vazar para o bundle do cliente.
 */
const EnvSchema = z.object({
  GATEWAY_URL: z.string().url().default('http://localhost:3000'),
  JWT_HS256_SECRET: z.string().min(16, 'JWT_HS256_SECRET deve ter ≥16 chars'),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // ── Upload de mídia (opcionais: sem eles a feature responde "indisponível",
  //    não derruba o boot — os adapters validam presença com erro amigável) ──
  // Cloudflare R2 (imagens/anexos/legendas VTT).
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  // Bucket PRIVADO (materiais didáticos/anexos) — sem URL pública; mesmas credenciais.
  R2_PRIVATE_BUCKET: z.string().optional(),
  // Vimeo (vídeos das aulas: upload TUS + capa + transcrição).
  VIMEO_ACCESS_TOKEN: z.string().optional(),
  VIMEO_WHITELIST_DOMAINS: z.string().optional(),
  // Pasta (project) do Vimeo onde os vídeos entram: dev=Testes, prod=Comunidade Sistema Zero.
  VIMEO_FOLDER_ID: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Env inválida no @sistemazero/admin: ${issues}`)
  }
  cached = parsed.data
  return cached
}

export function isProd(): boolean {
  return getEnv().NODE_ENV === 'production'
}
