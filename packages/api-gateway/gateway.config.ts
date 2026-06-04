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

const sharedResilience = {
  loadBalancer: 'round-robin' as const,
  timeoutMs: 15_000,
  circuitBreaker: { enabled: true, failureRate: 0.5, minThroughput: 20, cooldownMs: 10_000 },
  retry: { maxRetries: 1, baseDelayMs: 50, maxDelayMs: 1_000 },
}

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
        default: [{ url: CATALOG_URL, healthCheckPath: '/health' }],
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
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-get',
      methods: ['GET'],
      pathPattern: '/payments/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
      upstreamAuth: 'resign',
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
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
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-get',
      methods: ['GET'],
      pathPattern: '/payments/admin/payments/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-subscriptions-list',
      methods: ['GET'],
      pathPattern: '/payments/admin/subscriptions',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-subscription-get',
      methods: ['GET'],
      pathPattern: '/payments/admin/subscriptions/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-stats',
      methods: ['GET'],
      pathPattern: '/payments/admin/stats',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
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
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-ops',
      methods: ['GET'],
      pathPattern: '/payments/admin/ops',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Ações (escrita): estorno e cancelamento. Mesmos papéis das leituras (alinha
    // com `isAdminRole` do painel → evita botão que 403). Rate limit mais baixo.
    {
      id: 'payments-admin-refund',
      methods: ['POST'],
      pathPattern: '/payments/admin/payments/:id/refund',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-admin-subscription-cancel',
      methods: ['DELETE'],
      pathPattern: '/payments/admin/subscriptions/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
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
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'payments-my-get',
      methods: ['GET'],
      pathPattern: '/payments/my/:id',
      service: 'payments',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
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
      rateLimit: { max: 20, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'auth-login',
      methods: ['POST'],
      pathPattern: '/auth/login',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      rateLimit: { max: 20, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'auth-refresh',
      methods: ['POST'],
      pathPattern: '/auth/refresh',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
      rateLimit: { max: 60, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'auth-logout',
      methods: ['POST'],
      pathPattern: '/auth/logout',
      service: 'auth',
      auth: 'public',
      upstreamAuth: 'passthrough',
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
    {
      id: 'auth-admin-users-list',
      methods: ['GET'],
      pathPattern: '/auth/admin/users',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'auth-admin-user-get',
      methods: ['GET'],
      pathPattern: '/auth/admin/users/:id',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'auth-admin-user-update',
      methods: ['PATCH'],
      pathPattern: '/auth/admin/users/:id',
      service: 'auth',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
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
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
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
    // fora do gateway. Se um dia precisar via gateway, exponha como `auth: hmac`.
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
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-product-update',
      methods: ['PATCH'],
      pathPattern: '/catalog/products/:slug',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-offers-write',
      methods: ['POST'],
      pathPattern: '/catalog/offers',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-offer-update',
      methods: ['PATCH'],
      pathPattern: '/catalog/offers/:slug',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
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
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-coupon-update',
      methods: ['PATCH'],
      pathPattern: '/catalog/coupons/:id',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
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
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-admin-offers-list',
      methods: ['GET'],
      pathPattern: '/catalog/admin/offers',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'catalog-admin-coupons-list',
      methods: ['GET'],
      pathPattern: '/catalog/admin/coupons',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Resgate de uso do cupom (funil, na confirmação do pagamento): HMAC de borda do funil.
    {
      id: 'catalog-coupon-redeem',
      methods: ['POST'],
      pathPattern: '/catalog/coupons/:id/redeem',
      service: 'catalog',
      auth: { required: true, mode: 'any', strategies: ['hmac'] },
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
    // admin/staff; ESCRITA → superadmin/admin). SEM `membersInternalTransforms`: o
    // token interno é só da API do aluno; aqui o members confia no `requireAdmin`
    // sobre os X-Auth-User-* injetados (defesa em profundidade, igual ao catálogo).
    {
      id: 'members-admin-members-list',
      methods: ['GET'],
      pathPattern: '/members/admin/members',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-member-detail',
      methods: ['GET'],
      pathPattern: '/members/admin/members/:userId',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-grant',
      methods: ['POST'],
      pathPattern: '/members/admin/entitlements',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-entitlement-manage',
      methods: ['PATCH'],
      pathPattern: '/members/admin/entitlements/:id',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    },

    // ── Área de membros — Admin de AUTORIA de conteúdo ───────────────────────
    // Cursos → módulos → aulas → blocos/anexos. LEITURA (lista/árvore/conteúdo) →
    // superadmin/admin/staff; ESCRITA → superadmin/admin. Os `/*` casam o resto do
    // path — INCLUSIVE o próprio `/courses` (wildcard com cauda vazia) — e como rotas
    // mais longas ganham na especificidade, cobrem também a lista/criação (sem precisar
    // de rotas exatas separadas). O gateway repassa o path intacto; o members roteia com
    // precisão. `requireAdmin` confere os X-Auth-User-* (defesa em profundidade), SEM token interno.
    {
      id: 'members-admin-courses-read',
      methods: ['GET'],
      pathPattern: '/members/admin/courses/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-courses-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/members/admin/courses/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-modules-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/members/admin/modules/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-lessons-read',
      methods: ['GET'],
      pathPattern: '/members/admin/lessons/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-lessons-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/members/admin/lessons/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-blocks-write',
      methods: ['PATCH', 'DELETE'],
      pathPattern: '/members/admin/blocks/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'members-admin-attachments-write',
      methods: ['PATCH', 'DELETE'],
      pathPattern: '/members/admin/attachments/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
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
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    {
      id: 'messaging-admin-write',
      methods: ['POST', 'PATCH', 'DELETE'],
      pathPattern: '/messaging/admin/*',
      service: 'messaging',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    },
    // Webhooks de STATUS (provedores → gateway → messaging). Públicos: o serviço
    // valida a assinatura ECDSA (SendGrid) / o `?token=` (Evolution). O corpo é
    // repassado intacto (a assinatura é sobre o corpo bruto).
    {
      id: 'messaging-webhook-sendgrid',
      methods: ['POST'],
      pathPattern: '/messaging/webhooks/sendgrid',
      service: 'messaging',
      auth: 'public',
      rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
    },
    {
      id: 'messaging-webhook-evolution',
      methods: ['POST'],
      pathPattern: '/messaging/webhooks/evolution',
      service: 'messaging',
      auth: 'public',
      rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
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
