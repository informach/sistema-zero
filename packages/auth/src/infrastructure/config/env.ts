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

function isLocalhostUrl(value: string | undefined): boolean {
  if (!value) return false
  const host = new URL(value).hostname
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host === '0.0.0.0'
  )
}

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3002),
    // Endereço de bind. `::` (default) é dual-stack (IPv4 + IPv6) — obrigatório
    // para o private networking do Railway (`auth.railway.internal` resolve IPv6;
    // um bind `0.0.0.0` fica inalcançável). Igual ao payments.
    HOST: z.string().min(1).default('::'),
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

    // Sentry (monitoramento de erros). Ausente = desligado (dev/local).
    SENTRY_DSN: z.string().url().optional(),

    // JWT
    JWT_ALG: z.enum(['HS256', 'RS256']).default('HS256'),
    JWT_ISSUER: z.string().min(1).default('sistemazero-auth'),
    JWT_AUDIENCE: z.string().min(1).default('sistemazero'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    // TTL do refresh de sessões IMPERSONADAS (admin "entra como" um usuário —
    // sessão de suporte CURTA, morre sozinha; a rotação não a estica). 2h.
    IMPERSONATION_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(7200),
    // TTL do token de HANDOFF de impersonação (só atravessa a URL admin→community;
    // single-use). 60s.
    IMPERSONATION_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60),

    // HS256 (segredo simétrico — compartilhado com o gateway).
    JWT_HS256_SECRET: z.string().optional(),
    // RS256 (par de chaves). PEM com `\n` literais é normalizado no carregador de chaves.
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().optional(),
    JWT_KID: z.string().min(1).default('auth-key-1'),

    PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).default(10),

    // Reset/definição de senha
    RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),
    // TTL do link de PRIMEIRO ACESSO (convite do admin + welcome pós-compra do funil):
    // muito mais longo que o reset comum porque a pessoa pode comprar hoje e só
    // acessar dias depois. Default 14 dias (20160 min). O reset "esqueci a senha"
    // segue curto (RESET_TOKEN_TTL_MINUTES) — é o fluxo sensível de recuperação.
    INVITE_TOKEN_TTL_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .default(14 * 24 * 60),
    // Cooldown POR CONTA entre pedidos de reset público (`/auth/forgot-password`).
    // O rate limit do gateway é por IP — IPs distribuídos ainda conseguiriam
    // bombardear o inbox de UMA vítima e invalidar o token legítimo a cada pedido.
    // 0 desliga. NÃO se aplica aos fluxos S2S/convite (sem throttle).
    RESET_REQUEST_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(60),
    // OTP (login passwordless + recuperação de senha por código).
    OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    // Cooldown POR CONTA entre pedidos de código (`/auth/otp/request`) — mesma
    // lógica do RESET_REQUEST_COOLDOWN_SECONDS. 0 desliga.
    OTP_REQUEST_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(60),
    // Base dos links de e-mail (app community): `${COMMUNITY_URL}/redefinir-senha?token=...`.
    COMMUNITY_URL: z.string().url().default('http://localhost:3007'),
    // Base dos links da plataforma KIDS (community-kids). OPCIONAL: sem ela, fluxos
    // com `platform: 'kids'` respondem 400 (o boot do auth não depende do domínio
    // kids existir). Quando setada em produção, não pode ser localhost (refine).
    KIDS_COMMUNITY_URL: z.string().url().optional(),
    // Token interno injetado pelo gateway nas rotas `/auth/internal/*` (defesa em
    // profundidade). Vazio/ausente = checagem desligada (dev).
    AUTH_INTERNAL_TOKEN: z.string().optional(),

    // Área de membros (S2S direto na rede interna): o auth resolve o TETO de perfis
    // kids da conta em `GET /members/internal/profile-allowance` ao criar um perfil.
    MEMBERS_BASE_URL: z.string().url().default('http://localhost:3004'),
    MEMBERS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    // Token interno enviado na chamada S2S (= INTERNAL_API_TOKEN do members). Opcional
    // em dev/local (members sem token); OBRIGATÓRIO em produção (ver refine abaixo).
    MEMBERS_INTERNAL_TOKEN: z
      .string()
      .min(16, 'MEMBERS_INTERNAL_TOKEN deve ter ao menos 16 caracteres')
      .optional(),

    // Envio de e-mail via gateway → messaging (HMAC de borda, consumer `auth`).
    // Sem GATEWAY_URL + AUTH_HMAC_SECRET, o cliente vira no-op (envio desligado).
    GATEWAY_URL: z.string().url().optional(),
    GATEWAY_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    AUTH_CONSUMER_ID: z.string().min(1).default('auth'),
    AUTH_HMAC_SECRET: z.string().min(16).optional(),
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
  // Produção exige o token interno: sem ele a checagem das rotas S2S
  // (`/auth/internal/*`) fica DESLIGADA (fail-open) — se o serviço estiver
  // alcançável fora do gateway, `/auth/internal/password-tokens` emite token de
  // definição de senha para QUALQUER e-mail (account takeover). Fail-fast no boot
  // (o gateway precisa do MESMO valor em AUTH_INTERNAL_TOKEN para injetá-lo).
  .refine((e) => e.NODE_ENV !== 'production' || (e.AUTH_INTERNAL_TOKEN?.length ?? 0) >= 16, {
    message:
      'AUTH_INTERNAL_TOKEN é obrigatório em produção (≥ 16 caracteres) — sem ele as rotas /auth/internal/* e /auth/admin/* ficam sem a defesa em profundidade',
    path: ['AUTH_INTERNAL_TOKEN'],
  })
  // Produção exige o messaging configurado: sem GATEWAY_URL + AUTH_HMAC_SECRET o
  // cliente é NO-OP silencioso — forgot-password/OTP/convite respondem 200 mas
  // NENHUM e-mail sai (fluxos centrais quebrados sem nenhum erro visível).
  .refine((e) => e.NODE_ENV !== 'production' || Boolean(e.GATEWAY_URL && e.AUTH_HMAC_SECRET), {
    message:
      'GATEWAY_URL e AUTH_HMAC_SECRET são obrigatórios em produção — sem eles o envio de e-mail (reset/OTP/convite) é um no-op silencioso',
    path: ['GATEWAY_URL'],
  })
  // Em produção, o auth roda em outro container: localhost aponta para ele mesmo,
  // não para o gateway. Isso deixaria reset/OTP/convite presos em erro/timeout.
  .refine((e) => e.NODE_ENV !== 'production' || !isLocalhostUrl(e.GATEWAY_URL), {
    message:
      'GATEWAY_URL não pode apontar para localhost em produção (defina o host interno do gateway)',
    path: ['GATEWAY_URL'],
  })
  // Os links de e-mail apontam para o COMMUNITY_URL — o default localhost em
  // produção entregaria links quebrados (reset/convite inutilizáveis).
  .refine((e) => e.NODE_ENV !== 'production' || !isLocalhostUrl(e.COMMUNITY_URL), {
    message:
      'COMMUNITY_URL é obrigatória em produção (o default localhost geraria links de e-mail quebrados)',
    path: ['COMMUNITY_URL'],
  })
  // Mesma régua para a plataforma kids — mas só quando a env estiver setada.
  .refine(
    (e) =>
      e.NODE_ENV !== 'production' || !e.KIDS_COMMUNITY_URL || !isLocalhostUrl(e.KIDS_COMMUNITY_URL),
    {
      message:
        'KIDS_COMMUNITY_URL em produção não pode apontar para localhost (links de e-mail quebrados)',
      path: ['KIDS_COMMUNITY_URL'],
    },
  )
  // Produção exige o token interno do members: sem ele a rota S2S de allowance
  // responde 401 e NENHUM perfil pode ser criado (o create falha fechado).
  .refine((e) => e.NODE_ENV !== 'production' || (e.MEMBERS_INTERNAL_TOKEN?.length ?? 0) >= 16, {
    message:
      'MEMBERS_INTERNAL_TOKEN é obrigatório em produção (o members exige x-internal-token na rota S2S de profile-allowance)',
    path: ['MEMBERS_INTERNAL_TOKEN'],
  })
  // `MEMBERS_BASE_URL` tem default localhost (dev). Em produção precisa apontar para
  // o host interno (members.railway.internal) — localhost bootaria verde e quebraria
  // a criação de perfil em runtime.
  .refine(
    (e) => {
      if (e.NODE_ENV !== 'production') return true
      return !isLocalhostUrl(e.MEMBERS_BASE_URL)
    },
    {
      message:
        'MEMBERS_BASE_URL não pode apontar para localhost em produção (defina o host interno, ex.: http://members.railway.internal:3004)',
      path: ['MEMBERS_BASE_URL'],
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
