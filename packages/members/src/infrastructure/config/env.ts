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

/**
 * csv → prefixos da allowlist da foto do avatar. Prefixo que termina no HOST (sem
 * `/` de path) casaria por `startsWith` com `https://host.evil.com/…` e
 * `https://host@evil.com/…` — força o `/` que fecha o host. Prefixo com path já é
 * seguro (o host termina no `/`). Exportado puro p/ teste.
 */
export function normalizeAvatarPhotoPrefixes(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((prefix) => prefix.trim())
    .filter(Boolean)
    .map((prefix) => {
      const afterScheme = prefix.replace(/^https?:\/\//i, '')
      return afterScheme.includes('/') ? prefix : `${prefix}/`
    })
}

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
    // Rotas do Estúdio (entrega do aluno + autoria do bloco) carregam o projeto
    // INTEIRO — bem maior que os JSONs do aluno. Teto próprio (default 2 MB = teto
    // global da borda/gateway); o serviço ainda reforça `MAX_STUDIO_PROJECT_CHARS`
    // (1.5 M) na camada de aplicação. Sem isto, o teto de 64 KB rejeitava (413)
    // toda entrega de Estúdio não trivial ANTES do handler (era 100% quebrado em
    // prod, onde a env não é setada — ver server.ts `bodyLimitForPath`).
    MAX_STUDIO_BODY_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(2 * 1024 * 1024),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    // TLS na conexão com o Postgres. Default `false` (rede privada do Railway —
    // postura aceita); ligue (`DATABASE_SSL=true`) se o banco passar a exigir TLS
    // (ex.: Postgres externo/público) sem precisar mexer no código.
    DATABASE_SSL: optionalBool(false),

    // Sentry (monitoramento de erros). Ausente = desligado (dev/local).
    SENTRY_DSN: z.string().url().optional(),

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

    // Notificação ao HUB (comunidade) quando o acesso muda (grant) → o hub invalida o
    // micro-cache de acesso na hora, sem esperar o TTL. Chamada S2S DIRETA na rede interna,
    // assinada com o `GATEWAY_HMAC_SECRET` acima (o hub verifica com ele). OPCIONAL
    // (ausente = não notifica; o TTL do hub, ~30s, cobre como rede de segurança).
    HUB_BASE_URL: z.string().url().optional(),
    HUB_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(4_000),

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

    // Quota de IA por CONTA (interações/dia e /mês — Pensa, descrição do Mural e
    // recursos futuros). Calibrada p/ o cliente não sentir o teto com o custo em
    // centavos (gpt-4o-mini); ajustável por env sem retrabalho. Equipe é isenta
    // (grava mas nunca recusa).
    AI_LIMIT_DAILY: z.coerce.number().int().positive().default(50),
    AI_LIMIT_MONTHLY: z.coerce.number().int().positive().default(500),

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

    // Teto de perfis (kids, estilo Netflix) p/ contas com matrícula ativa mas SEM
    // `maxProfiles` no snapshot (compradores legados, anteriores ao campo). O teto
    // real vem do produto (catalog → snapshot); este é só o piso de compat/rollout.
    DEFAULT_KIDS_MAX_PROFILES: z.coerce.number().int().positive().default(1),

    // ── Report SEMANAL dos pais (Fase 5, 07/2026) ─────────────────────────────
    // O job só liga com o QUARTETO configurado (AUTH_BASE_URL + AUTH_INTERNAL_TOKEN
    // + GATEWAY_URL + MEMBERS_HMAC_SECRET) — sem eles é no-op silencioso (dev).
    // AUTH (S2S direto): e-mail/nome do responsável + nomes das crianças.
    AUTH_BASE_URL: z.string().url().optional(),
    AUTH_INTERNAL_TOKEN: z
      .string()
      .min(16, 'AUTH_INTERNAL_TOKEN deve ter ao menos 16 caracteres')
      .optional(),
    AUTH_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
    // Envio do e-mail VIA GATEWAY (consumer HMAC `members` — o x-consumer-id
    // confiável só o gateway injeta; NUNCA falar com o messaging direto).
    GATEWAY_URL: z.string().url().optional(),
    MEMBERS_HMAC_SECRET: z
      .string()
      .min(16, 'MEMBERS_HMAC_SECRET deve ter ao menos 16 caracteres')
      .optional(),
    // Gatilho: dia da semana (0=domingo … 6=sábado; default 5 = sexta) + hora SP.
    PARENT_REPORT_DOW: z.coerce.number().int().min(0).max(6).default(5),
    PARENT_REPORT_HOUR: z.coerce.number().int().min(0).max(23).default(17),
    // Ciclo do job (horário) + teto de contas por ciclo.
    PARENT_REPORT_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 1000),
    PARENT_REPORT_BATCH_LIMIT: z.coerce.number().int().positive().default(200),
    // URL pública do app kids (CTA "Ver na plataforma" do e-mail → /perfis).
    KIDS_COMMUNITY_URL: z.string().url().optional(),
    // ── Lembrete de RENOVAÇÃO (anual à vista) ───────────────────────────────
    // Janela (dias antes do vencimento) + ciclo do job + teto por ciclo.
    RENEWAL_REMINDER_DAYS_BEFORE: z.coerce.number().int().min(1).max(60).default(7),
    RENEWAL_REMINDER_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(6 * 60 * 60 * 1000),
    RENEWAL_REMINDER_BATCH_LIMIT: z.coerce.number().int().positive().default(200),
    // URL pública do FUNIL (base do link /renovar?oferta=<slug> do e-mail).
    FUNNEL_URL: z.string().url().optional(),

    // ── Foto do avatar (snapshot 3D) ─────────────────────────────────────────
    // Allowlist de PREFIXOS aceitos no `PUT /members/avatar/photo` (csv). A URL
    // vira <img> renderizada p/ OUTRAS crianças (liga/Clube/perfil público) —
    // aceitar URL externa arbitrária seria pixel-rastreador + conteúdo não
    // moderado (full review 24/07). O fluxo legítimo (BFF → R2 público) sempre
    // manda o prefixo do bucket. Vazio em dev = aceita qualquer http(s);
    // OBRIGATÓRIO em produção (refine abaixo).
    AVATAR_PHOTO_URL_PREFIXES: z
      .string()
      .optional()
      .transform((value) => normalizeAvatarPhotoPrefixes(value)),
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
  .refine((env) => env.NODE_ENV !== 'production' || env.AVATAR_PHOTO_URL_PREFIXES.length > 0, {
    message:
      'AVATAR_PHOTO_URL_PREFIXES é obrigatório em produção (allowlist da foto do avatar — sem ela qualquer URL externa viraria a cara da criança p/ os colegas)',
    path: ['AVATAR_PHOTO_URL_PREFIXES'],
  })
  // `CATALOG_BASE_URL` tem default `localhost:3003` (conveniência de dev). Esquecer
  // a env em produção bootava VERDE e quebrava TODO grant em runtime (502
  // OFFER_UNRESOLVED — comprador sem acesso em silêncio). Falha no boot em prod se
  // o host ainda apontar para localhost (vira o host interno: catalog.railway.internal).
  .refine(
    (env) => {
      if (env.NODE_ENV !== 'production') return true
      const host = new URL(env.CATALOG_BASE_URL).hostname
      return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1'
    },
    {
      message:
        'CATALOG_BASE_URL não pode apontar para localhost em produção (defina o host interno, ex.: http://catalog.railway.internal:3003)',
      path: ['CATALOG_BASE_URL'],
    },
  )
  // Mesma régua p/ o HUB_BASE_URL (quando configurado): em produção precisa do host
  // interno, não localhost. Ausente é OK (notificação é best-effort; o TTL do hub cobre).
  .refine(
    (env) => {
      if (env.NODE_ENV !== 'production' || !env.HUB_BASE_URL) return true
      const host = new URL(env.HUB_BASE_URL).hostname
      return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1'
    },
    {
      message:
        'HUB_BASE_URL não pode apontar para localhost em produção (defina o host interno, ex.: http://hub.railway.internal:3010)',
      path: ['HUB_BASE_URL'],
    },
  )

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
