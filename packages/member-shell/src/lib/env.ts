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
    // Origem PÚBLICA absoluta deste app (ex.: https://comunidade.sistemazero.com.br) —
    // usada p/ montar a URL de validação no QR do certificado. OPCIONAL: ausente → o QR
    // codifica só o caminho `/validar/:id` (degradado; em PRODUÇÃO deve ser setada para o
    // QR resolver ao ser escaneado).
    APP_PUBLIC_URL: z.string().url().optional(),
    // Sentry (opcional): ausente = no-op. Espelho de erros LOCAIS da área do aluno.
    SENTRY_DSN: z.string().url().optional(),
    // Segredo HMAC (= GATEWAY_HMAC_SECRET dos serviços) p/ VERIFICAR a chamada S2S
    // `POST /api/studio/cleanup` que o hub dispara ao APAGAR um post do Mural (limpa
    // o R2 do jogo). OPCIONAL: ausente → a rota é no-op (não há como autenticar o
    // chamador, então nada é apagado). ≥16 chars quando presente.
    GATEWAY_HMAC_SECRET: z.string().min(16, 'GATEWAY_HMAC_SECRET deve ter ≥16 chars').optional(),
    // Consumer HMAC do BFF para as duas mutações privadas do Zappy. O gateway
    // autentica `member-shell` e só então encaminha ao members.
    MEMBER_SHELL_HMAC_SECRET: z
      .string()
      .min(16, 'MEMBER_SHELL_HMAC_SECRET deve ter ≥16 chars')
      .optional(),
    // Chave estável do cookie temporário da Área dos Pais do community-kids. Em
    // produção aquele app a exige no boot; aqui permanece opcional porque o shell
    // também serve apps que não possuem esse portão.
    PARENT_GATE_HMAC_SECRET: z
      .string()
      .min(32, 'PARENT_GATE_HMAC_SECRET deve ter ≥32 chars')
      .optional(),
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
    // Modelo do Pensa: usado no CHAT (Zappy) E como base das sínteses — mais capaz
    // que o genérico barato (que gerava chips vagos, QA 02/07). OPCIONAL: ausente →
    // cai no OPENROUTER_MODEL.
    OPENROUTER_PENSA_MODEL: z.string().optional(),
    // Modelo das SÍNTESES PESADAS (spec/missões) — pode ser ainda mais capaz p/ os
    // planos de jogos GRANDES (JSON longo, mais mecânicas). OPCIONAL: ausente → cai
    // no OPENROUTER_PENSA_MODEL, e este no OPENROUTER_MODEL.
    OPENROUTER_PENSA_SYNTHESIS_MODEL: z.string().optional(),
    OPENROUTER_ZAPPY_MODEL: z.string().optional(),
    OPENROUTER_REFERER: z.string().url().optional(),
    // INTERRUPTOR DE EMERGÊNCIA do Zappy, LIGADO por padrão (08/2026 — o piloto
    // por allowlist de contas saiu; quem decide é a carreira, ver
    // `server/zappy-access.ts`). Existe porque o tutor gasta cota de IA por
    // interação: `false` derruba o tutor para todos menos a equipe, sem deploy.
    ZAPPY_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
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
  .refine((e) => e.NODE_ENV !== 'production' || Boolean(e.MEMBER_SHELL_HMAC_SECRET), {
    message: 'Em produção, MEMBER_SHELL_HMAC_SECRET é obrigatório para persistir o Zappy',
    path: ['MEMBER_SHELL_HMAC_SECRET'],
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
