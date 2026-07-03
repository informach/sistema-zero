import type { GatewayConfigInput } from './src/infrastructure/config/gateway-config.schema'

/**
 * Config declarativa do gateway. Adicionar/expor um serviço = editar este arquivo
 * (não código). Validado no boot (fail-fast).
 *
 * O gateway é o BFF de pagamentos do funil (@sistemazero/funnel):
 *  - O funil autentica-se no gateway por HMAC de borda (consumer `funnel`).
 *  - O gateway RE-ASSINA a chamada ao payments como seu próprio consumer
 *    (`upstreamAuth: 'resign'` + GATEWAY_CONSUMER_ID/GATEWAY_HMAC_SECRET).
 *    → o segredo do payments vive SÓ no gateway; o funil nunca fala com o payments.
 *  - O webhook `payment.paid` do payments chega em POST /webhooks/payments: o
 *    gateway valida a assinatura (verify-webhook, com GATEWAY_HMAC_SECRET), injeta
 *    um token interno e encaminha ao funil em /api/webhooks/payments.
 */
const PAYMENTS_URL = process.env.PAYMENTS_URL ?? 'http://localhost:3001'
const AUTH_URL = process.env.AUTH_URL ?? 'http://localhost:3002'
// Token interno injetado nas rotas admin + "minhas compras" do payments (defesa
// em profundidade, igual aos demais serviços): prova ao payments que os
// X-Auth-User-* vieram do gateway — sem ele, qualquer processo na rede interna
// forjaria um admin (estorno!) ou um e-mail de comprador chamando o serviço
// direto. DEVE bater com o INTERNAL_API_TOKEN do payments. As rotas consumer
// (`/payments`, `/payments/:id`) ficam de fora: têm HMAC próprio.
const PAYMENTS_INTERNAL_TOKEN = process.env.PAYMENTS_INTERNAL_TOKEN ?? ''
const paymentsInternalTransforms = PAYMENTS_INTERNAL_TOKEN
  ? [
      {
        type: 'header-inject' as const,
        options: { headers: { 'x-internal-token': PAYMENTS_INTERNAL_TOKEN } },
      },
    ]
  : []
const CATALOG_URL = process.env.CATALOG_URL ?? 'http://localhost:3003'
const MEMBERS_URL = process.env.MEMBERS_URL ?? 'http://localhost:3004'
// Token interno injetado nas rotas do ALUNO (members) como defesa em profundidade:
// prova ao members que a chamada veio do gateway (o `x-auth-user-id` confiável só
// vale se passou por aqui). DEVE bater com o INTERNAL_API_TOKEN do members.
const MEMBERS_INTERNAL_TOKEN = process.env.MEMBERS_INTERNAL_TOKEN ?? ''
// Só injeta quando configurado (header-inject vazio falha no boot); vazio em dev.
const membersInternalTransforms = MEMBERS_INTERNAL_TOKEN
  ? [
      {
        type: 'header-inject' as const,
        options: { headers: { 'x-internal-token': MEMBERS_INTERNAL_TOKEN } },
      },
    ]
  : []
// Token interno injetado nas rotas admin/escrita + redeem do catálogo (defesa em
// profundidade, igual ao members): prova ao catalog que a chamada veio do gateway
// (os X-Auth-User-* só são confiáveis se passaram por aqui). DEVE bater com o
// INTERNAL_API_TOKEN do catalog (o members usa o MESMO valor na chamada S2S direta
// de entitlements).
const CATALOG_INTERNAL_TOKEN = process.env.CATALOG_INTERNAL_TOKEN ?? ''
const catalogInternalTransforms = CATALOG_INTERNAL_TOKEN
  ? [
      {
        type: 'header-inject' as const,
        options: { headers: { 'x-internal-token': CATALOG_INTERNAL_TOKEN } },
      },
    ]
  : []
// Mensageria (@sistemazero/messaging): envio S2S de e-mail/WhatsApp por template.
// O gateway injeta o x-internal-token nas rotas de envio (defesa em profundidade,
// igual ao members). DEVE bater com o MESSAGING_INTERNAL_TOKEN do serviço.
const MESSAGING_URL = process.env.MESSAGING_URL ?? 'http://localhost:3006'
const MESSAGING_INTERNAL_TOKEN = process.env.MESSAGING_INTERNAL_TOKEN ?? ''
const messagingInternalTransforms = MESSAGING_INTERNAL_TOKEN
  ? [
      {
        type: 'header-inject' as const,
        options: { headers: { 'x-internal-token': MESSAGING_INTERNAL_TOKEN } },
      },
    ]
  : []
// Fiscal (@sistemazero/fiscal): emissão automática de NFS-e pós-garantia. O
// gateway injeta o x-internal-token nas rotas admin (defesa em profundidade,
// igual aos demais). DEVE bater com o INTERNAL_API_TOKEN do fiscal. O webhook
// payments→fiscal NÃO passa por aqui (private networking direto).
const FISCAL_URL = process.env.FISCAL_URL ?? 'http://localhost:3009'
const FISCAL_INTERNAL_TOKEN = process.env.FISCAL_INTERNAL_TOKEN ?? ''
const fiscalInternalTransforms = FISCAL_INTERNAL_TOKEN
  ? [
      {
        type: 'header-inject' as const,
        options: { headers: { 'x-internal-token': FISCAL_INTERNAL_TOKEN } },
      },
    ]
  : []
// O fiscal como consumer HMAC de borda (e-mail da NFS-e via /messaging/send).
const FISCAL_HMAC_SECRET = process.env.FISCAL_HMAC_SECRET ?? ''
const FISCAL_ALLOWED_CIDRS = (process.env.FISCAL_ALLOWED_CIDRS ?? '0.0.0.0/0,::/0')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean)
const FUNNEL_URL = process.env.FUNNEL_URL ?? 'http://localhost:4321'
const FUNNEL_HMAC_SECRET = process.env.FUNNEL_HMAC_SECRET ?? ''
const FUNNEL_INTERNAL_TOKEN = process.env.FUNNEL_INTERNAL_TOKEN ?? ''
const FUNNEL_ALLOWED_CIDRS = (process.env.FUNNEL_ALLOWED_CIDRS ?? '0.0.0.0/0,::/0')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean)
// O auth como consumer HMAC de borda (para chamar /messaging/send — e-mail de
// reset de senha). Espelha o funnel. DEVE bater com o AUTH_HMAC_SECRET do auth.
const AUTH_HMAC_SECRET = process.env.AUTH_HMAC_SECRET ?? ''
const AUTH_ALLOWED_CIDRS = (process.env.AUTH_ALLOWED_CIDRS ?? '0.0.0.0/0,::/0')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean)
// O members como consumer HMAC de borda (report SEMANAL dos pais via
// /messaging/send — Fase 5, 07/2026). Espelha o auth/fiscal. DEVE bater com o
// MEMBERS_HMAC_SECRET do members.
const MEMBERS_HMAC_SECRET = process.env.MEMBERS_HMAC_SECRET ?? ''
const MEMBERS_ALLOWED_CIDRS = (process.env.MEMBERS_ALLOWED_CIDRS ?? '0.0.0.0/0,::/0')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean)
// Token interno injetado nas rotas S2S do auth (/auth/internal/*) como defesa em
// profundidade (igual ao members/messaging). DEVE bater com o AUTH_INTERNAL_TOKEN do auth.
const AUTH_INTERNAL_TOKEN = process.env.AUTH_INTERNAL_TOKEN ?? ''
const authInternalTransforms = AUTH_INTERNAL_TOKEN
  ? [
      {
        type: 'header-inject' as const,
        options: { headers: { 'x-internal-token': AUTH_INTERNAL_TOKEN } },
      },
    ]
  : []

// Comunidade em fórum (@sistemazero/hub): spaces/canais/tópicos/comentários +
// reações + moderação. O gateway injeta o x-internal-token nas rotas do aluno e
// admin (defesa em profundidade, igual ao members). DEVE bater com o
// INTERNAL_API_TOKEN do hub.
const HUB_URL = process.env.HUB_URL ?? 'http://localhost:3010'
const HUB_INTERNAL_TOKEN = process.env.HUB_INTERNAL_TOKEN ?? ''
const hubInternalTransforms = HUB_INTERNAL_TOKEN
  ? [
      {
        type: 'header-inject' as const,
        options: { headers: { 'x-internal-token': HUB_INTERNAL_TOKEN } },
      },
    ]
  : []

const sharedResilience = {
  loadBalancer: 'round-robin' as const,
  timeoutMs: 15_000,
  circuitBreaker: { enabled: true, failureRate: 0.5, minThroughput: 20, cooldownMs: 10_000 },
  retry: { maxRetries: 1, baseDelayMs: 50, maxDelayMs: 1_000 },
}

// Teto de corpo p/ rotas públicas de JSON pequeno (login/OTP/quote/webhooks de
// pagamento): AFINA o teto global de 2 MB (necessário só p/ os lotes da SendGrid)
// — 64 KB já é generoso p/ esses payloads e corta abuso barato em rota sem auth.
const SMALL_JSON_BODY_BYTES = 64 * 1024

const config: GatewayConfigInput = {
  defaultVersion: 'v1',
  // CORS global. O funil chama o gateway server-to-server (sem Origin), então não
  // precisa liberar origem; mantenha restritivo se algum dia expor ao browser.
  cors: { origins: ['*'], credentials: false },
  consumers: [
    // O funil como cliente HMAC de borda do gateway. Segredo via FUNNEL_HMAC_SECRET.
    {
      id: 'funnel',
      hmacSecret: FUNNEL_HMAC_SECRET,
      allowedCidrs: FUNNEL_ALLOWED_CIDRS,
    },
    // O auth como cliente HMAC de borda (envio de e-mail via /messaging/send).
    // Condicional: sem AUTH_HMAC_SECRET o consumer não existe (o boot exige ≥16
    // chars) — e o auth, sem o segredo, usa o cliente no-op de qualquer forma.
    ...(AUTH_HMAC_SECRET
      ? [
          {
            id: 'auth',
            hmacSecret: AUTH_HMAC_SECRET,
            allowedCidrs: AUTH_ALLOWED_CIDRS,
          },
        ]
      : []),
    // O fiscal como consumer HMAC de borda (e-mail da NFS-e via /messaging/send).
    ...(FISCAL_HMAC_SECRET
      ? [
          {
            id: 'fiscal',
            hmacSecret: FISCAL_HMAC_SECRET,
            allowedCidrs: FISCAL_ALLOWED_CIDRS,
          },
        ]
      : []),
    // O members como consumer HMAC de borda (report semanal dos pais via
    // /messaging/send). Condicional, igual ao auth/fiscal.
    ...(MEMBERS_HMAC_SECRET
      ? [
          {
            id: 'members',
            hmacSecret: MEMBERS_HMAC_SECRET,
            allowedCidrs: MEMBERS_ALLOWED_CIDRS,
          },
        ]
      : []),
  ],
  services: {
    payments: {
      name: 'payments',
      upstreamGroups: {
        default: [{ url: PAYMENTS_URL, healthCheckPath: '/health' }],
      },
      loadBalancer: 'p2c-ewma',
      timeoutMs: 15_000,
      circuitBreaker: { enabled: true, failureRate: 0.5, minThroughput: 20, cooldownMs: 10_000 },
      retry: { maxRetries: 1, baseDelayMs: 50, maxDelayMs: 1_000 },
    },
    funnel: {
      name: 'funnel',
      upstreamGroups: {
        default: [{ url: FUNNEL_URL, healthCheckPath: '/health' }],
      },
      ...sharedResilience,
    },
    // Serviço de identidade (IdP): registro/login + emissão de JWT.
    auth: {
      name: 'auth',
      upstreamGroups: {
        default: [{ url: AUTH_URL, healthCheckPath: '/health' }],
      },
      ...sharedResilience,
    },
    // Catálogo: produtos, combos e ofertas (fonte da verdade comercial) + entitlements.
    catalog: {
      name: 'catalog',
      upstreamGroups: {
        default: [{ url: CATALOG_URL, healthCheckPath: '/readyz' }],
      },
      ...sharedResilience,
    },
    // Área de membros: matrícula/entitlement, cursos e progresso (consumo do aluno).
    members: {
      name: 'members',
      upstreamGroups: {
        default: [{ url: MEMBERS_URL, healthCheckPath: '/health' }],
      },
      ...sharedResilience,
    },
    // Mensageria: envio transacional de e-mail (SendGrid) e WhatsApp (Evolution).
    messaging: {
      name: 'messaging',
      upstreamGroups: {
        default: [{ url: MESSAGING_URL, healthCheckPath: '/health' }],
      },
      ...sharedResilience,
    },
    // Serviço fiscal: NFS-e automática pós-garantia (admin-only via gateway).
    fiscal: {
      name: 'fiscal',
      upstreamGroups: {
        default: [{ url: FISCAL_URL, healthCheckPath: '/healthz' }],
      },
      ...sharedResilience,
    },
    // Comunidade em fórum: servidores/canais/tópicos/comentários + moderação.
    hub: {
      name: 'hub',
      upstreamGroups: {
        default: [{ url: HUB_URL, healthCheckPath: '/health' }],
      },
      ...sharedResilience,
    },
  },
  routes: [
    // Funil → gateway (HMAC de borda) → payments (gateway re-assina).
    {
      id: 'payments-create',
      methods: ['POST'],
      pathPattern: '/payments',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      upstreamAuth: 'resign',
      // Criação síncrona de cobrança chama a Efí (mTLS + OAuth + cob + QR). No 1º
      // checkout pós-restart (cache frio) isso pode passar dos 15s do default →
      // 504/502. Damos folga aqui (o payments tem seu próprio timeout/retry interno).
      timeoutMs: 35_000,
      // ⚠️ Todo o funil é UM principal (`funnel`) → este teto é o limite AGREGADO
      // de checkouts do produto (10/s). O payments tem o próprio rate limit por
      // consumidor; aqui é proteção contra runaway, não controle de capacidade.
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-get',
      methods: ['GET'],
      pathPattern: '/payments/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      upstreamAuth: 'resign',
      // Teto AGREGADO do polling de status de TODOS os compradores pendentes
      // (funil = um principal): 50/s comporta ~150 PIX pendentes simultâneos
      // pollando a cada 3s — dimensionado p/ pico de lançamento.
      rateLimit: { max: 3000, windowMs: 60_000, by: 'principal' },
    },
    // ── Admin de pagamentos (painel @sistemazero/admin) ──────────────────────
    // LEITURA + ações (estorno/cancelar) para o dono operar. JWT + RBAC no gateway
    // (admin/staff); o payments confere os X-Auth-* (requireAdmin, defesa em
    // profundidade). SEM `resign`: o default strip-a as credenciais do cliente e
    // injeta X-Auth-User-* (≠ das rotas consumer `/payments`,`/payments/:id`, HMAC).
    // Caminho `/payments/admin/*` (≥3 segmentos) NÃO colide com `/payments/:id`.
    {
      id: 'payments-admin-list',
      methods: ['GET'],
      pathPattern: '/payments/admin/payments',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-get',
      methods: ['GET'],
      pathPattern: '/payments/admin/payments/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-subscriptions-list',
      methods: ['GET'],
      pathPattern: '/payments/admin/subscriptions',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-subscription-get',
      methods: ['GET'],
      pathPattern: '/payments/admin/subscriptions/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-stats',
      methods: ['GET'],
      pathPattern: '/payments/admin/stats',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Série diária do painel "Gestão de vendas". Rota PRÓPRIA: o matcher exige
    // igualdade de nº de segmentos (sem prefix matching), então `/stats` não cobre.
    {
      id: 'payments-admin-stats-daily',
      methods: ['GET'],
      pathPattern: '/payments/admin/stats/daily',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-ops',
      methods: ['GET'],
      pathPattern: '/payments/admin/ops',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Ações (escrita): estorno e cancelamento. Admin+; staff acompanha, mas não
    // executa mutações financeiras. Rate limit mais baixo.
    {
      id: 'payments-admin-refund',
      methods: ['POST'],
      pathPattern: '/payments/admin/payments/:id/refund',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      audit: {},
    },
    {
      id: 'payments-admin-subscription-cancel',
      methods: ['DELETE'],
      pathPattern: '/payments/admin/subscriptions/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      audit: {},
    },
    // ── Minhas compras (app community — self-service do COMPRADOR) ──────────
    // JWT obrigatório (qualquer conta ativa, inclusive `customer` — sem `roles`).
    // O gateway injeta X-Auth-User-* (inclui o e-mail) e o payments filtra as
    // compras por `customer->>'email'` = e-mail das claims. O literal `my` vence
    // o param `:id` na especificidade do matcher (não colide com a rota HMAC).
    {
      id: 'payments-my-list',
      methods: ['GET'],
      pathPattern: '/payments/my',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-my-get',
      methods: ['GET'],
      pathPattern: '/payments/my/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: paymentsInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    // payments → gateway → funil. O gateway valida a assinatura do webhook
    // (verify-webhook), injeta o token interno e reescreve o path para /api/...
    {
      id: 'webhooks-payments',
      methods: ['POST'],
      pathPattern: '/webhooks/payments',
      service: 'funnel',
      auth: 'public',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
      transforms: [
        { type: 'verify-webhook', options: { secretEnvVar: 'GATEWAY_HMAC_SECRET' } },
        {
          type: 'header-inject',
          options: { headers: { 'x-internal-token': FUNNEL_INTERNAL_TOKEN } },
        },
        { type: 'path-rewrite', options: { addPrefix: '/api' } },
      ],
    },

    // ── Identidade (@sistemazero/auth) ──────────────────────────────────────
    // O IdP é a autoridade da sua própria auth: o gateway só ROTEIA (+ rate limit
    // por IP contra brute-force) e repassa o corpo/headers (`passthrough` mantém o
    // Authorization do /me chegando ao serviço). Cadastro/login são públicos.
    {
      id: 'auth-register',
      methods: ['POST'],
      pathPattern: '/auth/register',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 20, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'auth-login',
      methods: ['POST'],
      pathPattern: '/auth/login',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 20, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'auth-refresh',
      methods: ['POST'],
      pathPattern: '/auth/refresh',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'auth-logout',
      methods: ['POST'],
      pathPattern: '/auth/logout',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'auth-me',
      methods: ['GET'],
      pathPattern: '/auth/me',
      service: 'auth',
      auth: 'public',
      // passthrough: o Authorization (Bearer) precisa chegar ao auth, que o verifica.
      upstreamAuth: 'passthrough',
      rateLimit: { max: 120, windowMs: 60_000, by: 'ip' },
    },
    // "Esqueci minha senha": rate limit AGRESSIVO por IP (anti-enumeração/spam de
    // e-mail). O auth responde SEMPRE 200; o e-mail é enviado via messaging.
    {
      id: 'auth-forgot-password',
      methods: ['POST'],
      pathPattern: '/auth/forgot-password',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 5, windowMs: 60_000, by: 'ip' },
    },
    // Redefinição/definição de senha por token single-use (reset + 1º acesso).
    {
      id: 'auth-reset-password',
      methods: ['POST'],
      pathPattern: '/auth/reset-password',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 20, windowMs: 60_000, by: 'ip' },
    },
    // OTP: pede um código por e-mail. Rate limit AGRESSIVO por IP (anti-enumeração/
    // spam de e-mail); o auth responde SEMPRE 200.
    {
      id: 'auth-otp-request',
      methods: ['POST'],
      pathPattern: '/auth/otp/request',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 5, windowMs: 60_000, by: 'ip' },
    },
    // OTP: verifica o código e loga (passwordless). Limite por IP cobre o brute-force
    // do código (o auth também trava por tentativas no código).
    {
      id: 'auth-otp-verify',
      methods: ['POST'],
      pathPattern: '/auth/otp/verify',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 20, windowMs: 60_000, by: 'ip' },
    },
    // Recuperação de senha por OTP (consome o código + define a nova senha).
    {
      id: 'auth-password-reset-otp',
      methods: ['POST'],
      pathPattern: '/auth/password/reset-otp',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 20, windowMs: 60_000, by: 'ip' },
    },
    // Self-service de perfil (app community): o Bearer chega ao auth (passthrough),
    // que o verifica e edita o PRÓPRIO usuário (nome/telefone — e-mail não).
    {
      id: 'auth-me-update',
      methods: ['PATCH'],
      pathPattern: '/auth/me',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 30, windowMs: 60_000, by: 'ip' },
    },
    // Troca de senha logado (exige a senha atual; revoga as sessões no auth).
    {
      id: 'auth-me-password',
      methods: ['POST'],
      pathPattern: '/auth/me/password',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 10, windowMs: 60_000, by: 'ip' },
    },
    // Token de DEFINIÇÃO de senha do 1º acesso pós-compra (S2S: funil → auth).
    // HMAC de borda (consumer `funnel`) + injeção do token interno do auth
    // (defesa em profundidade, igual ao members/messaging). SEM `resign`.
    {
      id: 'auth-internal-password-token',
      methods: ['POST'],
      pathPattern: '/auth/internal/password-tokens',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Garante o usuário do comprador (novo/recorrente) no pós-pagamento e devolve o
    // `userId` — destrava a concessão ao comprador recorrente. Mesma proteção S2S do
    // password-token (HMAC do funil + injeção do `x-internal-token`). SEM `resign`.
    {
      id: 'auth-internal-ensure-buyer',
      methods: ['POST'],
      pathPattern: '/auth/internal/ensure-buyer',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'auth-jwks',
      methods: ['GET'],
      pathPattern: '/auth/.well-known/jwks.json',
      service: 'auth',
      auth: 'public',
      rateLimit: { max: 120, windowMs: 60_000, by: 'ip' },
    },
    // GESTÃO admin de usuários (painel @sistemazero/admin): JWT + RBAC, espelhando o
    // admin do catálogo. Caminho `/auth/admin/*` distinto das rotas públicas de
    // identidade acima. NÃO é `passthrough`: o gateway verifica o token, tira o
    // Bearer e injeta X-Auth-User-* confiável — o `auth` lê o ator daí, re-checa o
    // papel (defesa em profundidade) e aplica os guards hierárquicos. Leitura aceita
    // staff; a edição (PATCH) afina para superadmin/admin (o auth ainda barra admin↛admin).
    // COM `authInternalTransforms` (igual ao members-admin): o auth exige o
    // `x-internal-token` também no admin — sem ele os X-Auth-User-* seriam forjáveis
    // por quem alcançasse o serviço direto na rede interna.
    {
      id: 'auth-admin-users-list',
      methods: ['GET'],
      pathPattern: '/auth/admin/users',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Criação pelo painel (fluxo CONVITE: senha aleatória + e-mail de definição).
    // Mesmo path literal do list — o matcher distingue pelo MÉTODO. Escrita →
    // superadmin/admin (o auth ainda barra admin criando admin/superadmin).
    {
      id: 'auth-admin-user-create',
      methods: ['POST'],
      pathPattern: '/auth/admin/users',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      audit: { targetResponseField: 'user.id' },
    },
    {
      id: 'auth-admin-user-get',
      methods: ['GET'],
      pathPattern: '/auth/admin/users/:id',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'auth-admin-user-update',
      methods: ['PATCH'],
      pathPattern: '/auth/admin/users/:id',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      audit: {},
    },
    // EXCLUSÃO de usuário (limpeza de contas de teste/lixo). DESTRUTIVA + cascata —
    // SÓ superadmin (o auth re-checa: não-self, alvo não-admin/superadmin). Mesmo
    // path literal do GET/PATCH — o matcher distingue pelo MÉTODO. O painel orquestra
    // a purga em members/hub ANTES desta chamada (financeiro/fiscal são retidos).
    {
      id: 'auth-admin-user-delete',
      methods: ['DELETE'],
      pathPattern: '/auth/admin/users/:id',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      audit: {},
    },
    // Hidratação de identidade em LOTE (≤100 ids) — usada pelo painel admin (área de
    // membros lista userIds e precisa de nome/email). Leitura → superadmin/admin/staff.
    {
      id: 'auth-admin-users-batch',
      methods: ['POST'],
      pathPattern: '/auth/admin/users/batch',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // "Entrar como" (impersonação p/ suporte): emite o token de HANDOFF single-use.
    // ESCRITA → superadmin/admin (o auth re-checa a matriz: admin só impersona
    // customer/staff; superadmin qualquer um; nunca a si mesmo). 4 segmentos —
    // não colide com `/auth/admin/users/:id` (o matcher exige nº igual de segmentos).
    {
      id: 'auth-admin-user-impersonate',
      methods: ['POST'],
      pathPattern: '/auth/admin/users/:id/impersonate',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      audit: {},
    },
    // Perfis (estilo Netflix) de uma conta — o painel de membros hidrata o progresso
    // por perfil. LEITURA staff+. 4 segmentos, literal `profiles` ≠ `impersonate`.
    {
      id: 'auth-admin-user-profiles',
      methods: ['GET'],
      pathPattern: '/auth/admin/users/:id/profiles',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Auditoria de ações administrativas — leitura sensível (admin+; staff não vê
    // ações de outros operadores). Deve ir pelo gateway para injetar o token interno.
    {
      id: 'auth-admin-audit-list',
      methods: ['GET'],
      pathPattern: '/auth/admin/audit',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Exchange do handoff de impersonação (chamado pelo SERVIDOR da community, sem
    // Bearer — como o /login). A segurança é do próprio token (single-use, TTL 60s,
    // consumo atômico no auth); aqui só rate limit por IP contra brute-force.
    {
      id: 'auth-impersonate-exchange',
      methods: ['POST'],
      pathPattern: '/auth/impersonate/exchange',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 20, windowMs: 60_000, by: 'ip' },
    },

    // Perfis (estilo Netflix) gerenciados pelo RESPONSÁVEL — QUALQUER conta ATIVA
    // (sem roles, igual ao `/payments/my`). O gateway injeta X-Auth-User-* +
    // `x-internal-token` (`authInternalTransforms`); o auth lê o `accountUserId` daí
    // e aplica o ownership. Path literal `/auth/profiles` (2 segmentos) não colide
    // com `/auth/admin/*`. PR2 fará o auth recusar a gestão em sessão DE PERFIL.
    {
      id: 'auth-profiles-list',
      methods: ['GET'],
      pathPattern: '/auth/profiles',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'auth-profile-create',
      methods: ['POST'],
      pathPattern: '/auth/profiles',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: authInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'auth-profile-update',
      methods: ['PATCH'],
      pathPattern: '/auth/profiles/:id',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: authInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'auth-profile-archive',
      methods: ['DELETE'],
      pathPattern: '/auth/profiles/:id',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    // Entrar/trocar de perfil (a "troca de um clique"): emite a sessão de perfil.
    // Aceita conta OU outra sessão de perfil (o auth resolve o accountUserId do
    // x-auth-account-id/x-auth-user-id). 4 segmentos — não colide com `/auth/profiles/:id`.
    {
      id: 'auth-profile-select',
      methods: ['POST'],
      pathPattern: '/auth/profiles/:id/select',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    // Sair do perfil para a área dos pais (gateado pela senha do responsável no auth).
    {
      id: 'auth-profile-session-exit',
      methods: ['POST'],
      pathPattern: '/auth/profile-session/exit',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: authInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    // Identidade PÚBLICA de um perfil (BFF do perfil público kids): nome + flag de
    // visibilidade — o auth NÃO devolve PII. JWT + conta ativa (o visitante) +
    // `x-internal-token`. 5 segmentos (`/auth/internal/profiles/:id/public`) — não
    // colide com `/auth/profiles/:id` nem `/auth/profiles/:id/select`.
    {
      id: 'auth-internal-profile-public',
      methods: ['GET'],
      pathPattern: '/auth/internal/profiles/:id/public',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: authInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },

    // ── Catálogo (@sistemazero/catalog) ──────────────────────────────────────
    // LEITURA pública (dados de marketing, não sensíveis) — o funil consome via
    // gateway. ESCRITA exige JWT do auth + RBAC (admin/staff): o gateway verifica
    // o token, resolve o usuário e injeta X-Auth-* (o catálogo confere o role como
    // defesa em profundidade). `:slug` é só placeholder de match — o path real
    // (slug OU id) é repassado intacto ao upstream.
    {
      id: 'catalog-offer-get',
      methods: ['GET'],
      pathPattern: '/catalog/offers/:slug',
      service: 'catalog',
      auth: 'public',
      upstreamAuth: 'passthrough',
      rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
    },
    // `GET /catalog/offers/:slug/entitlements` NÃO é exposto aqui de propósito: ele
    // devolve o `fulfillment` completo (asset url/ref, courseRef) e seria leitura
    // pública. Quem consome é a área de membros, S2S na rede interna (CATALOG_URL),
    // fora do gateway — enviando o `x-internal-token` (CATALOG_INTERNAL_TOKEN) que o
    // catalog exige. Se um dia precisar via gateway, exponha como `auth: hmac`.
    {
      id: 'catalog-product-get',
      methods: ['GET'],
      pathPattern: '/catalog/products/:slug',
      service: 'catalog',
      auth: 'public',
      upstreamAuth: 'passthrough',
      rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'catalog-products-write',
      methods: ['POST'],
      pathPattern: '/catalog/products',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-product-update',
      methods: ['PATCH'],
      pathPattern: '/catalog/products/:slug',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-offers-write',
      methods: ['POST'],
      pathPattern: '/catalog/offers',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-offer-update',
      methods: ['PATCH'],
      pathPattern: '/catalog/offers/:slug',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    // Cotação com cupom (checkout): pública + rate limit por IP (mitiga brute-force de código).
    {
      id: 'catalog-offer-quote',
      methods: ['POST'],
      pathPattern: '/catalog/offers/:slug/quote',
      service: 'catalog',
      auth: 'public',
      upstreamAuth: 'passthrough',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 120, windowMs: 60_000, by: 'ip' },
    },
    // Cadastro/edição de cupons (admin via JWT + RBAC).
    {
      id: 'catalog-coupons-write',
      methods: ['POST'],
      pathPattern: '/catalog/coupons',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-coupon-update',
      methods: ['PATCH'],
      pathPattern: '/catalog/coupons/:id',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    // LEITURA admin (listagens paginadas p/ o painel @sistemazero/admin): JWT + RBAC.
    // Caminho `/catalog/admin/*` distinto das leituras públicas `/:slug`.
    {
      id: 'catalog-admin-products-list',
      methods: ['GET'],
      pathPattern: '/catalog/admin/products',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // GET-one de produto (página de edição do painel: deep-link/refresh).
    {
      id: 'catalog-admin-product-get',
      methods: ['GET'],
      pathPattern: '/catalog/admin/products/:id',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-admin-offers-list',
      methods: ['GET'],
      pathPattern: '/catalog/admin/offers',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-admin-coupons-list',
      methods: ['GET'],
      pathPattern: '/catalog/admin/coupons',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Resgate de uso do cupom (funil, na confirmação do pagamento): HMAC de borda do
    // funil + x-internal-token (o catalog exige a prova de origem — sem ela, acesso
    // direto na rede interna queimaria contador de cupom).
    {
      id: 'catalog-coupon-redeem',
      methods: ['POST'],
      pathPattern: '/catalog/coupons/:id/redeem',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      transforms: catalogInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },

    // ── Área de membros (@sistemazero/members) ───────────────────────────────
    // Consumo do ALUNO: JWT do auth obrigatório (gateway verifica, resolve o
    // usuário e injeta X-Auth-User-* ao upstream); `authorize.statuses:['active']`
    // garante só conta ativa. `:slug`/`:lessonId` são placeholders — o path real
    // é repassado intacto.
    {
      id: 'members-my-courses',
      methods: ['GET'],
      pathPattern: '/members/courses',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Catálogo "Todos os cursos" (published + flag hasAccess do aluno).
    {
      id: 'members-catalog',
      methods: ['GET'],
      pathPattern: '/members/catalog',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // "Esta conta tem acesso a estes produtos?" (`?refs=`) — gate de produto que NÃO é
    // curso de trilha (ex.: o Estúdio Completo vendável). O app kids busca num Server
    // Component ao abrir /estudio; resposta pequena, recurso do próprio usuário.
    {
      id: 'members-access',
      methods: ['GET'],
      pathPattern: '/members/access',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Teto de perfis (kids) da conta — o app dos pais trava o "Adicionar" + "X de Y".
    {
      id: 'members-profile-allowance',
      methods: ['GET'],
      pathPattern: '/members/profile-allowance',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Perfil de gamificação do aluno (XP/streak/badges) — widgets do kids buscam
    // a cada render de página (layout + home), por isso o teto generoso.
    {
      id: 'members-gamification-me',
      methods: ['GET'],
      pathPattern: '/members/gamification/me',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    // Desafio do MÊS (game jam kids): tema determinístico global + `entered` do perfil.
    // Literal `/gamification/challenge` (2 seg) não colide com `/gamification/me`.
    {
      id: 'members-gamification-challenge',
      methods: ['GET'],
      pathPattern: '/members/gamification/challenge',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Missões (diárias/semanais) + proteção de sequência — recurso do PRÓPRIO perfil
    // (kids). `/missions/me` (3 seg), `/missions/:slug/claim` (4 seg), `/streak-freeze/buy`
    // (3 seg) e `/vacation` (2 seg) NÃO colidem entre si nem com `/gamification/me`.
    {
      id: 'members-missions-me',
      methods: ['GET'],
      pathPattern: '/members/gamification/missions/me',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-mission-claim',
      methods: ['POST'],
      pathPattern: '/members/gamification/missions/:slug/claim',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 1024,
    },
    {
      id: 'members-streak-freeze-buy',
      methods: ['POST'],
      pathPattern: '/members/gamification/streak-freeze/buy',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 1024,
    },
    {
      id: 'members-vacation',
      methods: ['PUT'],
      pathPattern: '/members/gamification/vacation',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
    },
    // Liga semanal (board + tier resolvido lazy). `/league/me` (3 seg) não colide com
    // `/missions/me` nem com `/gamification/me`.
    {
      id: 'members-league-me',
      methods: ['GET'],
      pathPattern: '/members/gamification/league/me',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Avatar (guarda-roupa por camadas) — recurso do PRÓPRIO perfil (kids). Estado +
    // lojinha (GET), compra de peça com moedas (POST) e salvar a config equipada (PUT).
    // `/members/avatar` (2 segmentos) não colide com `/members/courses…` nem com o
    // wildcard `/members/admin/*`; `/members/avatar/parts/:id/buy` (4 segmentos) idem.
    {
      id: 'members-avatar-get',
      methods: ['GET'],
      pathPattern: '/members/avatar',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-avatar-buy',
      methods: ['POST'],
      pathPattern: '/members/avatar/parts/:partId/buy',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 1024,
    },
    {
      id: 'members-avatar-equip',
      methods: ['PUT'],
      pathPattern: '/members/avatar',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 4096,
    },
    {
      // Salva a URL do snapshot (foto) do avatar 3D — corpo pequeno (só a URL). 3 segmentos:
      // não colide com `/members/avatar` (2 seg, get/equip) nem com o buy (4 seg).
      id: 'members-avatar-photo',
      methods: ['PUT'],
      pathPattern: '/members/avatar/photo',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 4096,
    },
    // Perfil PÚBLICO de outra criança (gamificação: xp/ranking/conquistas/avatar/quarto)
    // — qualquer conta ATIVA da comunidade lê (peer-viewable). O BFF junta com a
    // identidade do auth e GATEIA pela flag dos pais. `/members/profiles/*` (3 segmentos)
    // não colide com `/members/courses…` nem com o wildcard `/members/admin/*`.
    {
      id: 'members-profile-public',
      methods: ['GET'],
      pathPattern: '/members/profiles/:profileId/public',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Quarto virtual (decore-do-seu-jeito) — recurso do PRÓPRIO perfil (kids). Estado +
    // lojinha (GET), salvar o quarto montado (PUT) e comprar item/tema (POST).
    // `/members/room` (2 seg) não colide; `/members/room/items/:id/buy` (4 seg) idem.
    {
      id: 'members-room-get',
      methods: ['GET'],
      pathPattern: '/members/room',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-room-save',
      methods: ['PUT'],
      pathPattern: '/members/room',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
    },
    {
      id: 'members-room-buy',
      methods: ['POST'],
      pathPattern: '/members/room/items/:itemId/buy',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 1024,
    },
    // ── Pensa (planejamento guiado — metodologia ZERO, vitrine kids) ──────────
    // Recurso do PRÓPRIO perfil (como avatar/quarto): projetos → ciclos → etapas
    // Z/E/R/O com artefatos, kanban de missões e checklist. O gate de PRODUTO
    // (ref `pensa`) é aplicado pelo members no CREATE do projeto; as demais rotas
    // são ownership por user_id. Literal `pensa` no 2º segmento — não colide com
    // `/members/courses…`, `/members/profiles/:id/public` nem `/members/admin/*`.
    // A chamada de IA (chat SSE) NÃO passa por aqui — vive no BFF (member-shell).
    {
      id: 'members-pensa-projects',
      methods: ['GET', 'POST'],
      pathPattern: '/members/pensa/projects',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 4096,
    },
    {
      id: 'members-pensa-project',
      methods: ['GET', 'PATCH'],
      pathPattern: '/members/pensa/projects/:projectId',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 4096,
    },
    {
      // Snapshot do projeto do ESTÚDIO atrelado ao projeto do Pensa (backup na
      // nuvem do jogo em construção): GET restaura em navegador novo, PUT sobe o
      // JSON inteiro (pode ter assets data-URL) — por isso SEM maxBodyBytes (cai
      // no teto GLOBAL de 2MB, mesma régua da entrega do bloco estúdio).
      id: 'members-pensa-studio-snapshot',
      methods: ['GET', 'PUT'],
      pathPattern: '/members/pensa/projects/:projectId/studio-snapshot',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-pensa-cycle-create',
      methods: ['POST'],
      pathPattern: '/members/pensa/projects/:projectId/cycles',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 4096,
    },
    {
      id: 'members-pensa-stage',
      methods: ['GET'],
      pathPattern: '/members/pensa/cycles/:cycleId/stages/:stage',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    // Persiste um TURNO do chat (mensagem da criança + resposta do agente + estado
    // das 5 perguntas) — chamado pelo BFF ao fim de cada stream, nunca pelo browser
    // direto. Corpo maior (conversa/summary).
    {
      id: 'members-pensa-conversation',
      methods: ['PUT'],
      pathPattern: '/members/pensa/cycles/:cycleId/stages/:stage/conversation',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 512 * 1024,
    },
    {
      id: 'members-pensa-artifact-create',
      methods: ['POST'],
      pathPattern: '/members/pensa/cycles/:cycleId/artifacts',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 512 * 1024,
    },
    {
      id: 'members-pensa-artifact-validate',
      methods: ['POST'],
      pathPattern: '/members/pensa/cycles/:cycleId/artifacts/:type/validate',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 1024,
    },
    {
      id: 'members-pensa-advance',
      methods: ['POST'],
      pathPattern: '/members/pensa/cycles/:cycleId/advance',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 1024,
    },
    {
      // PUT = REPLACE total; POST = APPEND (autoria manual / "sugerir mais missões").
      id: 'members-pensa-tasks-replace',
      methods: ['PUT', 'POST'],
      pathPattern: '/members/pensa/cycles/:cycleId/tasks',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 512 * 1024,
    },
    {
      // PATCH = mover/anotar/EDITAR o conteúdo da missão; DELETE = apagar 1 card.
      id: 'members-pensa-task-update',
      methods: ['PATCH', 'DELETE'],
      pathPattern: '/members/pensa/tasks/:taskId',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      // O PATCH pode carregar a missão inteira editada (steps+hints) → 64KB de folga.
      maxBodyBytes: 64 * 1024,
    },
    {
      id: 'members-pensa-checklist-replace',
      methods: ['PUT'],
      pathPattern: '/members/pensa/cycles/:cycleId/checklist',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
    },
    {
      id: 'members-pensa-checklist-toggle',
      methods: ['PATCH'],
      pathPattern: '/members/pensa/checklist/:itemId',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: 1024,
    },
    // Resumo de progresso dos FILHOS (área dos pais, kids). A conta vem do header
    // confiável `x-auth-user-id` (o members usa resolveUserId — não o accountId do
    // cliente); o BFF chama atrás do portão de senha. Path literal `/members/parents/*`
    // não colide com `/members/courses…` nem com o wildcard `/members/admin/*`.
    {
      id: 'members-children-stats',
      methods: ['GET'],
      pathPattern: '/members/parents/children-stats',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Preferência do REPORT semanal dos pais (opt-out) — mesma régua do
    // children-stats: keyada na CONTA; o BFF gateia atrás do portão de senha.
    {
      id: 'members-parent-report-prefs-get',
      methods: ['GET'],
      pathPattern: '/members/parents/report-prefs',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-parent-report-prefs-put',
      methods: ['PUT'],
      pathPattern: '/members/parents/report-prefs',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-course-detail',
      methods: ['GET'],
      pathPattern: '/members/courses/:slug',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-course-progress',
      methods: ['GET'],
      pathPattern: '/members/courses/:slug/progress',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-lesson-detail',
      methods: ['GET'],
      pathPattern: '/members/courses/:slug/lessons/:lessonId',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    },
    // Resolução de download de anexo (devolve a localização real do arquivo) —
    // consumida SÓ pelo servidor do community; a storageRef nunca chega ao browser.
    {
      id: 'members-attachment-resolve',
      methods: ['GET'],
      pathPattern: '/members/courses/:slug/lessons/:lessonId/attachments/:attachmentId/resolve',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Resolução do PDF do bloco e-book (livro 3D) — mesmo perfil do resolve de
    // anexo: consumida SÓ pelo servidor do community; storageRef nunca vai ao browser.
    {
      id: 'members-block-ebook-resolve',
      methods: ['GET'],
      pathPattern: '/members/courses/:slug/lessons/:lessonId/blocks/:blockId/ebook/resolve',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-lesson-complete',
      methods: ['POST'],
      pathPattern: '/members/lessons/:lessonId/complete',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    // Posição do vídeo (throttled no client, mas chega com frequência) — teto alto.
    {
      id: 'members-video-position',
      methods: ['PUT'],
      pathPattern: '/members/courses/:slug/lessons/:lessonId/position',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    },
    // Classificação do curso (estilo Udemy): GET = estado do aluno; PUT = upsert
    // incremental (cada passo do fluxo de modais persiste o estado acumulado).
    {
      id: 'members-course-rating-get',
      methods: ['GET'],
      pathPattern: '/members/courses/:slug/rating',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-course-rating-put',
      methods: ['PUT'],
      pathPattern: '/members/courses/:slug/rating',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Submit de quiz (score no servidor; cooldown reforçado no members) — moderado.
    {
      id: 'members-quiz-attempt',
      methods: ['POST'],
      pathPattern: '/members/lessons/:lessonId/blocks/:blockId/quiz-attempts',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    // Entrega do projeto do Estúdio (mesmo JSON do "Exportar projeto"). Corpo maior
    // que os JSONs pequenos do aluno (o projeto inteiro) — cabe no teto global (2 MB);
    // o members reforça o próprio teto. Baixa frequência (envio manual) → 30/min.
    {
      id: 'members-studio-submission',
      methods: ['POST'],
      pathPattern: '/members/lessons/:lessonId/blocks/:blockId/studio-submission',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    // GET do MESMO path: o projeto que o aluno ENVIOU (save na nuvem) — 2ª prioridade ao abrir a
    // aula. Distinção GET/POST pelo método (como o certificate). Lazy, resposta pode trazer o
    // projeto inteiro (streaming, sem teto de corpo). Rate limit do carryover (leitura lazy).
    {
      id: 'members-studio-submission-get',
      methods: ['GET'],
      pathPattern: '/members/lessons/:lessonId/blocks/:blockId/studio-submission',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Carrega o projeto da aula contínua anterior (mesma cadeia) p/ semear o editor —
    // GET lazy chamado SÓ na 1ª abertura sem rascunho local; a resposta pode trazer o
    // projeto inteiro (cabe na resposta em streaming, sem teto de corpo de requisição).
    {
      id: 'members-studio-carryover',
      methods: ['GET'],
      pathPattern: '/members/lessons/:lessonId/blocks/:blockId/studio-carryover',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Payload autoritativo da vitrine (Mural): o BFF chama no clique "Publicar no
    // Mural" p/ montar o post (título/resumo do admin) sem confiar no cliente.
    {
      id: 'members-showcase-payload',
      methods: ['GET'],
      pathPattern: '/members/lessons/:lessonId/blocks/:blockId/showcase-payload',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Certificado de conclusão (bloco da última aula). GET = estado (elegível/emitido);
    // POST = emite (idempotente no members). Mesma régua das demais rotas do aluno
    // (JWT + conta ativa + `x-internal-token`); distinção GET/POST pelo método (leaf
    // `certificate` ≠ quiz-attempts/studio-submission). O PDF é montado no BFF.
    {
      id: 'members-certificate-state',
      methods: ['GET'],
      pathPattern: '/members/lessons/:lessonId/blocks/:blockId/certificate',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-certificate-issue',
      methods: ['POST'],
      pathPattern: '/members/lessons/:lessonId/blocks/:blockId/certificate',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
    },
    // Validação PÚBLICA do certificado pelo id (lido do QR — `/validar/:id`): SEM login
    // (o BFF chama server-side, sem Bearer), mas o gateway injeta o `x-internal-token`
    // (a rota do members é interna). Só dados não-sensíveis; rate limit por IP.
    {
      id: 'members-certificate-validate',
      methods: ['GET'],
      pathPattern: '/members/internal/certificates/:id/validate',
      service: 'members',
      auth: 'public',
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'ip' },
    },
    // Concessão/assinatura (funil → gateway → members): HMAC de borda do funil +
    // o gateway re-assina como consumer `gateway` (members verifica com GATEWAY_HMAC_SECRET).
    {
      id: 'members-webhook-grant',
      methods: ['POST'],
      pathPattern: '/members/webhooks/grant',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      upstreamAuth: 'resign',
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-webhook-subscription',
      methods: ['POST'],
      pathPattern: '/members/webhooks/subscription',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      upstreamAuth: 'resign',
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    },

    // ── Área de membros — Admin (painel `@sistemazero/admin`) ────────────────
    // Gestão de acesso pelo operador. JWT + RBAC no gateway (LEITURA → superadmin/
    // admin/staff; ESCRITA → superadmin/admin). COM `membersInternalTransforms`
    // (06/2026): o members exige o `x-internal-token` também no admin — os
    // X-Auth-User-* só são confiáveis se a chamada passou pelo gateway; sem o
    // token, qualquer processo na rede interna forjaria um admin chamando direto.
    {
      id: 'members-admin-members-list',
      methods: ['GET'],
      pathPattern: '/members/admin/members',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-member-detail',
      methods: ['GET'],
      pathPattern: '/members/admin/members/:userId',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    // Ficha 360 do aluno (LEITURA staff+): gamificação, linha do tempo de atividade,
    // certificados e classificações. Sufixos literais (≥5 segmentos) não colidem com
    // `/members/admin/members/:userId` (mais específicos ganham na especificidade).
    {
      id: 'members-admin-member-gamification',
      methods: ['GET'],
      pathPattern: '/members/admin/members/:userId/gamification',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-member-activity',
      methods: ['GET'],
      pathPattern: '/members/admin/members/:userId/activity',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-member-certificates',
      methods: ['GET'],
      pathPattern: '/members/admin/members/:userId/certificates',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-member-ratings',
      methods: ['GET'],
      pathPattern: '/members/admin/members/:userId/ratings',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    // Analytics de aprendizado (LEITURA staff+): overview por curso + funil por aula.
    // `/analytics/courses` (3 seg) e `/analytics/courses/:courseId` (4 seg) não colidem
    // com `/members/admin/members*` nem com a autoria `/members/admin/courses*`.
    {
      id: 'members-admin-analytics-overview',
      methods: ['GET'],
      pathPattern: '/members/admin/analytics/courses',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-analytics-funnel',
      methods: ['GET'],
      pathPattern: '/members/admin/analytics/courses/:courseId',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-grant',
      methods: ['POST'],
      pathPattern: '/members/admin/entitlements',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      audit: { targetField: 'userId' },
    },
    {
      id: 'members-admin-entitlement-manage',
      methods: ['PATCH'],
      pathPattern: '/members/admin/entitlements/:id',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      audit: {},
    },

    // ── Área de membros — Admin de AUTORIA de conteúdo ───────────────────────
    // Cursos → módulos → aulas → blocos/anexos. LEITURA (lista/árvore/conteúdo) →
    // superadmin/admin/staff; ESCRITA → superadmin/admin. Os `/*` casam o resto do
    // path — INCLUSIVE o próprio `/courses` (wildcard com cauda vazia) — e como rotas
    // mais longas ganham na especificidade, cobrem também a lista/criação (sem precisar
    // de rotas exatas separadas). O gateway repassa o path intacto; o members roteia com
    // precisão. `requireAdmin` confere os X-Auth-User-* + `x-internal-token` injetado
    // (defesa em profundidade — ver comentário do bloco admin acima).
    {
      id: 'members-admin-courses-read',
      methods: ['GET'],
      pathPattern: '/members/admin/courses/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-courses-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/members/admin/courses/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-modules-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/members/admin/modules/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-lessons-read',
      methods: ['GET'],
      pathPattern: '/members/admin/lessons/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-lessons-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/members/admin/lessons/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-blocks-write',
      methods: ['PATCH', 'DELETE'],
      pathPattern: '/members/admin/blocks/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Leitura admin de blocos (GET `/members/admin/blocks/:id/studio-submissions[/:userId]`):
    // acompanhamento das entregas do Estúdio pelo professor (LEITURA staff+).
    {
      id: 'members-admin-blocks-read',
      methods: ['GET'],
      pathPattern: '/members/admin/blocks/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-attachments-write',
      methods: ['PATCH', 'DELETE'],
      pathPattern: '/members/admin/attachments/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Revogar um certificado emitido (a validação pública passa a mostrar inválido).
    // 4 segmentos — não colide com as demais rotas admin.
    {
      id: 'members-admin-certificate-revoke',
      methods: ['POST'],
      pathPattern: '/members/admin/certificates/:id/revoke',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      audit: {},
    },
    // PURGA dos dados do aluno (exclusão de usuário pelo painel). DESTRUTIVA — SÓ
    // superadmin (espelha o delete do auth). `?profileIds=` cobre os perfis kids.
    // 5 segmentos — não colide com `/members/admin/members/:userId`.
    {
      id: 'members-admin-user-purge',
      methods: ['DELETE'],
      pathPattern: '/members/admin/users/:id/data',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin'], statuses: ['active'] },
      transforms: membersInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      audit: {},
    },

    // ── Mensageria (@sistemazero/messaging) ─────────────────────────────────
    // Envio S2S (backend → gateway por HMAC de borda → messaging). O gateway injeta
    // o `x-internal-token` (defesa em profundidade, como o members); SEM `resign`.
    {
      id: 'messaging-send',
      methods: ['POST'],
      pathPattern: '/messaging/send',
      service: 'messaging',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      transforms: messagingInternalTransforms,
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'messaging-message-get',
      methods: ['GET'],
      pathPattern: '/messaging/messages/:id',
      service: 'messaging',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      transforms: messagingInternalTransforms,
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    },
    // Admin (painel): JWT + RBAC. `/messaging/admin/*` distinto das rotas S2S acima.
    // LEITURA (GET) → superadmin/admin/staff; ESCRITA → superadmin/admin. Wildcard
    // `/*` casa todos os subpaths (templates/senders/whatsapp-instances/messages).
    {
      id: 'messaging-admin-read',
      methods: ['GET'],
      pathPattern: '/messaging/admin/*',
      service: 'messaging',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      // 06/2026: o messaging exige o x-internal-token TAMBÉM no admin — prova de
      // que os X-Auth-User-* vieram do gateway (igual members/catalog).
      transforms: messagingInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'messaging-admin-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/messaging/admin/*',
      service: 'messaging',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: messagingInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Webhooks de STATUS (provedores → gateway → messaging). Públicos: o serviço
    // valida a assinatura ECDSA (SendGrid) / o `?token=` (Evolution). O corpo é
    // repassado intacto (a assinatura é sobre o corpo bruto). Teto de 2 MB
    // EXPLÍCITO: os lotes de evento da SendGrid chegam a ~768 KB+ e o messaging
    // os aceita até 2 MB — é por causa destas rotas que o teto GLOBAL é 2 MB.
    {
      id: 'messaging-webhook-sendgrid',
      methods: ['POST'],
      pathPattern: '/messaging/webhooks/sendgrid',
      service: 'messaging',
      auth: 'public',
      maxBodyBytes: 2 * 1024 * 1024,
      rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'messaging-webhook-evolution',
      methods: ['POST'],
      pathPattern: '/messaging/webhooks/evolution',
      service: 'messaging',
      auth: 'public',
      maxBodyBytes: 2 * 1024 * 1024,
      rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
    },

    // ── Fiscal (NFS-e): admin do painel. JWT + RBAC no gateway; o fiscal
    // confere os X-Auth-* (requireAdmin) + x-internal-token (prova de origem).
    // Espelha o payments-admin. O webhook payments→fiscal NÃO passa por aqui.
    {
      id: 'fiscal-admin-invoices-list',
      methods: ['GET'],
      pathPattern: '/fiscal/admin/invoices',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'fiscal-admin-invoice-get',
      methods: ['GET'],
      pathPattern: '/fiscal/admin/invoices/:id',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'fiscal-admin-invoice-pdf',
      methods: ['GET'],
      pathPattern: '/fiscal/admin/invoices/:id/pdf',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Ações de escrita: admin+ (staff não cancela/substitui nota fiscal).
    {
      id: 'fiscal-admin-invoice-retry',
      methods: ['POST'],
      pathPattern: '/fiscal/admin/invoices/:id/retry',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'fiscal-admin-invoice-cancel',
      methods: ['POST'],
      pathPattern: '/fiscal/admin/invoices/:id/cancel',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'fiscal-admin-invoice-substitute',
      methods: ['POST'],
      pathPattern: '/fiscal/admin/invoices/:id/substitute',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'fiscal-admin-invoice-emit-now',
      methods: ['POST'],
      pathPattern: '/fiscal/admin/invoices/:id/emit-now',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    // Emissão MANUAL por pagamento (backfill/antecipação — decisão do admin).
    // MESMO path literal do GET list; o matcher distingue pelo método.
    {
      id: 'fiscal-admin-invoice-create',
      methods: ['POST'],
      pathPattern: '/fiscal/admin/invoices',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'fiscal-admin-stats',
      methods: ['GET'],
      pathPattern: '/fiscal/admin/stats',
      service: 'fiscal',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: fiscalInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },

    // ── Comunidade em fórum (@sistemazero/hub) ───────────────────────────────
    // Consumo do ALUNO: JWT + conta ativa; o gateway injeta X-Auth-User-* +
    // `x-internal-token` (defesa em profundidade, igual ao members). Perfil de
    // FÓRUM (não chat): leituras 300/min; escrita (tópico/comentário/edição)
    // 60/min + corpo 64KB; reações/seen/report 120/min. `:slug`/`:id`/`:emoji`
    // são placeholders de match — o path real é repassado intacto ao upstream.
    {
      id: 'hub-spaces',
      methods: ['GET'],
      pathPattern: '/hub/spaces',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-space-get',
      methods: ['GET'],
      pathPattern: '/hub/spaces/:slug',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-space-channels',
      methods: ['GET'],
      pathPattern: '/hub/spaces/:slug/channels',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-channel-threads',
      methods: ['GET'],
      pathPattern: '/hub/channels/:id/threads',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-thread-create',
      methods: ['POST'],
      pathPattern: '/hub/channels/:id/threads',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-thread-get',
      methods: ['GET'],
      pathPattern: '/hub/threads/:id',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-thread-comments',
      methods: ['GET'],
      pathPattern: '/hub/threads/:id/comments',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-comment-create',
      methods: ['POST'],
      pathPattern: '/hub/threads/:id/comments',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-thread-edit',
      methods: ['PATCH'],
      pathPattern: '/hub/threads/:id',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    // Auto-publicação de projeto no Mural (BFF → hub, em nome da criança). O hub trata
    // como criação de sistema (bypass staff_only, idempotente); JWT da criança + token
    // interno injetado. Corpo pequeno (título/resumo/capa-URL/chave). 4 segmentos —
    // `/hub/internal/...` não colide com as rotas do aluno nem com `/hub/admin/*`.
    {
      id: 'hub-showcase-create',
      methods: ['POST'],
      pathPattern: '/hub/internal/showcase-thread',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    // Variação KID-DRIVEN do "Compartilhar" do Estúdio: descrição da criança +
    // link público de jogar (playId). 4 segmentos — não colide com showcase-thread
    // nem com /hub/admin/*. O hub re-valida elegibilidade (S2S members) e autoria.
    {
      id: 'hub-showcase-create-studio',
      methods: ['POST'],
      pathPattern: '/hub/internal/showcase-thread-studio',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    // "Compartilhar" do ESTÚDIO COMPLETO (produto vendável, SEM aula): título +
    // descrição da criança + playId. O hub re-valida a POSSE do produto (S2S members).
    // `showcase-thread-studio-standalone` é segmento literal distinto de
    // `showcase-thread-studio` (sem colisão de prefixo no matcher).
    {
      id: 'hub-showcase-create-studio-standalone',
      methods: ['POST'],
      pathPattern: '/hub/internal/showcase-thread-studio-standalone',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    // Player público do Estúdio (BFF sem Bearer) valida que o playId ainda pertence
    // a um post visível no Mural antes de servir o JSON privado do R2.
    // `?count=1` (BFF, deduplicado por ip:playId lá) funde o contador de jogadas.
    {
      id: 'hub-studio-play-visible',
      methods: ['GET'],
      pathPattern: '/hub/internal/studio-play/:playId',
      service: 'hub',
      auth: 'public',
      transforms: hubInternalTransforms,
      rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
    },
    // Carreira do aluno: agregado dos próprios jogos no Mural (publicados + jogadas).
    {
      id: 'hub-my-showcase-stats',
      methods: ['GET'],
      pathPattern: '/hub/my-showcase-stats',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-comment-edit',
      methods: ['PATCH'],
      pathPattern: '/hub/comments/:id',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-thread-react-add',
      methods: ['POST'],
      pathPattern: '/hub/threads/:id/reactions',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-thread-react-remove',
      methods: ['DELETE'],
      pathPattern: '/hub/threads/:id/reactions/:emoji',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-comment-react-add',
      methods: ['POST'],
      pathPattern: '/hub/comments/:id/reactions',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-comment-react-remove',
      methods: ['DELETE'],
      pathPattern: '/hub/comments/:id/reactions/:emoji',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-channel-seen',
      methods: ['POST'],
      pathPattern: '/hub/channels/:id/seen',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-thread-report',
      methods: ['POST'],
      pathPattern: '/hub/threads/:id/report',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-comment-report',
      methods: ['POST'],
      pathPattern: '/hub/comments/:id/report',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Registro de metadado de anexo (o BFF mint o presigned PUT e chama esta rota).
    {
      id: 'hub-attachments-register',
      methods: ['POST'],
      pathPattern: '/hub/attachments',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    // Resolução do anexo (devolve o storageRef ao BFF, que mint o presigned GET).
    {
      id: 'hub-attachment-resolve',
      methods: ['GET'],
      pathPattern: '/hub/attachments/:id/resolve',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Admin (painel): JWT + RBAC. `/hub/admin/*` distinto das rotas do aluno.
    // LEITURA (GET) → superadmin/admin/staff; ESCRITA → superadmin/admin. Wildcard
    // `/*` casa todos os subpaths (spaces/channels/reorder/pending/reports/...).
    {
      id: 'hub-admin-read',
      methods: ['GET'],
      pathPattern: '/hub/admin/*',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'hub-admin-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/hub/admin/*',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      transforms: hubInternalTransforms,
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    // PURGA dos dados de comunidade do usuário (exclusão pelo painel). DESTRUTIVA —
    // SÓ superadmin (rota EXPLÍCITA vence o wildcard `hub-admin-write` por
    // especificidade, fixando superadmin-only; espelha o delete do auth).
    {
      id: 'hub-admin-user-purge',
      methods: ['DELETE'],
      pathPattern: '/hub/admin/users/:id/data',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin'], statuses: ['active'] },
      transforms: hubInternalTransforms,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      audit: {},
    },
    // Concessão/revogação (funil/members → gateway → hub): invalida o cache de
    // acesso. HMAC de borda + o gateway re-assina como consumer `gateway`.
    {
      id: 'hub-webhook-grant',
      methods: ['POST'],
      pathPattern: '/hub/webhooks/grant',
      service: 'hub',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      upstreamAuth: 'resign',
      maxBodyBytes: SMALL_JSON_BODY_BYTES,
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    },

    // ── Exemplo: rota de negócio protegida por JWT + RBAC ────────────────────
    // O gateway VERIFICA o token do auth (configure JWT_HS256_SECRET — mesmo segredo
    // do auth — ou JWT_JWKS_URL=<auth>/auth/.well-known/jwks.json + JWT_ISSUER/AUDIENCE),
    // resolve o usuário das claims, aplica o RBAC e injeta X-Auth-* ao upstream.
    // {
    //   id: 'admin-area',
    //   methods: ['GET', 'POST'],
    //   pathPattern: '/admin/*',
    //   service: '<algum-serviço>',
    //   auth: { required: true, mode: 'any', strategies: ['jwt'] },
    //   authorize: { roles: ['admin', 'staff'], statuses: ['active'] },
    // },
  ],
}

export default config
