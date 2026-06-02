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
const FUNNEL_URL = process.env.FUNNEL_URL ?? 'http://localhost:4321'
const FUNNEL_HMAC_SECRET = process.env.FUNNEL_HMAC_SECRET ?? ''
const FUNNEL_INTERNAL_TOKEN = process.env.FUNNEL_INTERNAL_TOKEN ?? ''
const FUNNEL_ALLOWED_CIDRS = (process.env.FUNNEL_ALLOWED_CIDRS ?? '0.0.0.0/0,::/0')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean)

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
    {
      id: 'auth-jwks',
      methods: ['GET'],
      pathPattern: '/auth/.well-known/jwks.json',
      service: 'auth',
      auth: 'public',
      rateLimit: { max: 120, windowMs: 60_000, by: 'ip' },
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
