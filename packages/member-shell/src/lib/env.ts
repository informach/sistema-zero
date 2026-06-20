import 'server-only'
import { z } from 'zod'

/**
 * Env do servidor (fail-fast). NUNCA é importado por Client Component — `server-only`
 * garante o erro de build se vazar para o bundle do cliente.
 */
const EnvSchema = z
  .object({
    GATEWAY_URL: z.string().url().default('http://localhost:3000'),
    // Verificação do access JWT — HS256 (segredo compartilhado; dev/local) e/ou
    // RS256 via JWKS (PRODUÇÃO: o auth emite RS256 e não há segredo HS256 lá —
    // aponte p/ o gateway: <GATEWAY_URL>/auth/.well-known/jwks.json).
    // Pelo menos UM dos dois é obrigatório (refine abaixo).
    JWT_HS256_SECRET: z.string().min(16, 'JWT_HS256_SECRET deve ter ≥16 chars').optional(),
    JWT_JWKS_URL: z.string().url().optional(),
    JWT_ISSUER: z.string().optional(),
    JWT_AUDIENCE: z.string().optional(),
    // Fallback da página de vendas em "Todos os cursos" (curso sem metadata.salesPageUrl).
    FUNNEL_URL: z.string().url().optional(),
    // Sentry (opcional): ausente = no-op. Espelho de erros LOCAIS da área do aluno.
    SENTRY_DSN: z.string().url().optional(),
    // Cloudflare R2 (upload de avatar). OPCIONAIS: ausentes → upload responde 503
    // amigável (MEDIA_NOT_CONFIGURED), nunca quebra o boot.
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: z.string().url().optional(),
    // Bucket PRIVADO (materiais didáticos) — leitura p/ a rota de download com marca
    // d'água. Sem URL pública; mesmas credenciais R2. Ausente → download responde 503.
    R2_PRIVATE_BUCKET: z.string().optional(),
    // Bucket PRIVADO de UGC da comunidade (anexos de tópicos/comentários do fórum).
    // Upload/download DIRETO browser↔R2 por URL pré-assinada (CORS PUT/GET); o BFF
    // só assina (acesso checado pelo hub). Sem URL pública. Ausente → anexos 503.
    R2_UGC_BUCKET: z.string().optional(),
    // OpenRouter (descrição do projeto no "Compartilhar" do Estúdio) — chave NO
    // SERVIDOR. OPCIONAL: ausente → a descrição da IA cai no fallback (a criança
    // escreve do zero), nunca quebra o boot nem a publicação.
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default('openai/gpt-4o-mini'),
    OPENROUTER_REFERER: z.string().url().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  // Sem nenhuma forma de verificar o token, toda sessão seria inválida em silêncio.
  .refine((e) => Boolean(e.JWT_HS256_SECRET || e.JWT_JWKS_URL), {
    message:
      'Configure JWT_HS256_SECRET (dev/HS256) e/ou JWT_JWKS_URL (produção/RS256 via gateway)',
    path: ['JWT_JWKS_URL'],
  })
  // Em PRODUÇÃO o auth emite RS256 e o gateway verifica via JWKS — HS256 não tem
  // lugar aqui. Exigir JWKS e RECUSAR um segredo HS256 fecha o vetor de um segredo
  // fraco copiado de dev forjar token aceito na autorização LOCAL das rotas de
  // mídia (`/api/me/avatar`, downloads de material). Espelha o admin.
  .refine((e) => e.NODE_ENV !== 'production' || Boolean(e.JWT_JWKS_URL), {
    message: 'Em produção, JWT_JWKS_URL é obrigatório (o auth emite RS256 via JWKS)',
    path: ['JWT_JWKS_URL'],
  })
  .refine((e) => e.NODE_ENV !== 'production' || !e.JWT_HS256_SECRET, {
    message:
      'Em produção, NÃO configure JWT_HS256_SECRET (um segredo HS256 forjaria a sessão local de mídia/downloads)',
    path: ['JWT_HS256_SECRET'],
  })

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Env inválida no @sistemazero/community: ${issues}`)
  }
  cached = parsed.data
  return cached
}

export function isProd(): boolean {
  return getEnv().NODE_ENV === 'production'
}
