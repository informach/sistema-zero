import { z } from 'zod'
import { AUTH_STRATEGY_KINDS, HTTP_METHODS, LB_STRATEGIES } from '../../domain/routing/route'

/**
 * Schema declarativo do gateway (fonte única dos tipos de config). Validado no
 * boot (fail-fast). Os tipos de domínio/aplicação importam os tipos inferidos
 * daqui como `import type` (acoplamento só-de-tipo, apagado em runtime).
 */
const httpMethod = z.enum(HTTP_METHODS)
const lbStrategy = z.enum(LB_STRATEGIES)
const authStrategyKind = z.enum(AUTH_STRATEGY_KINDS)

export const upstreamConfigSchema = z.object({
  id: z.string().optional(), // se ausente, derivado da url
  url: z.string().url(), // base URL, ex.: http://payments.railway.internal:3001
  weight: z.number().int().positive().default(1),
  healthCheckPath: z.string().default('/health'),
})

export const circuitBreakerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  failureRate: z.number().min(0).max(1).default(0.5),
  minThroughput: z.number().int().positive().default(20),
  cooldownMs: z.number().int().positive().default(10_000),
})

export const retryPolicyConfigSchema = z.object({
  maxRetries: z.number().int().nonnegative().default(0),
  perTryTimeoutMs: z.number().int().positive().optional(),
  budgetMs: z.number().int().positive().optional(),
  baseDelayMs: z.number().int().positive().default(50),
  maxDelayMs: z.number().int().positive().default(1_000),
})

export const authPolicySchema = z.union([
  z.literal('public'),
  z.object({
    required: z.boolean().default(true),
    mode: z.enum(['any', 'all']).default('any'),
    strategies: z.array(authStrategyKind).min(1),
  }),
])

export const rateLimitRuleSchema = z.object({
  max: z.number().int().positive(),
  windowMs: z.number().int().positive().default(60_000),
  by: z.enum(['principal', 'ip']).default('principal'),
})

export const corsConfigSchema = z
  .object({
    origins: z.array(z.string()).optional(), // strings exatas, regex `/.../` ou '*'
    methods: z.array(httpMethod).optional(),
    allowedHeaders: z.array(z.string()).optional(),
    exposeHeaders: z.array(z.string()).optional(),
    credentials: z.boolean().optional(),
    maxAge: z.number().int().nonnegative().optional(),
  })
  // Refletir qualquer origem (`*` ou sem allowlist) COM credentials é proibido pela
  // spec de CORS e perigoso. Force uma allowlist explícita quando credentials=true.
  .refine((c) => !(c.credentials === true && (!c.origins?.length || c.origins.includes('*'))), {
    message: 'credentials=true exige uma allowlist de origins explícita (sem "*")',
    path: ['credentials'],
  })

export const transformRefSchema = z.union([
  z.string(),
  z.object({ type: z.string(), options: z.record(z.string(), z.unknown()).optional() }),
])

export const versionMappingSchema = z.object({
  version: z.string(),
  upstreamGroup: z.string().optional(),
  rewritePrefix: z.string().optional(),
  deprecated: z.boolean().default(false),
  sunset: z.string().optional(), // HTTP-date ou ISO
})

export const routeConfigSchema = z.object({
  id: z.string(),
  methods: z.array(httpMethod).min(1),
  pathPattern: z.string(), // ex.: '/payments', '/payments/:id', '/payments/*'
  service: z.string(),
  upstreamGroup: z.string().default('default'),
  auth: authPolicySchema.default('public'),
  upstreamAuth: z.enum(['passthrough', 'resign']).optional(),
  rateLimit: rateLimitRuleSchema.optional(),
  cors: corsConfigSchema.optional(),
  transforms: z.array(transformRefSchema).default([]),
  timeoutMs: z.number().int().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
  lb: lbStrategy.optional(),
  stripPrefix: z.boolean().default(false),
  rewritePrefix: z.string().optional(),
  versions: z.array(versionMappingSchema).optional(),
})

export const serviceConfigSchema = z.object({
  name: z.string(),
  upstreamGroups: z.record(z.string(), z.array(upstreamConfigSchema).min(1)),
  loadBalancer: lbStrategy.default('round-robin'),
  circuitBreaker: circuitBreakerConfigSchema.prefault({}),
  retry: retryPolicyConfigSchema.prefault({}),
  timeoutMs: z.number().int().positive().default(15_000),
})

export const consumerConfigSchema = z.object({
  id: z.string(),
  // Segredo HMAC do consumer. Mínimo de 16 chars: impede que um env ausente
  // (default '') suba com auth efetivamente desabilitada (assinatura com chave vazia).
  hmacSecret: z.string().min(16, 'hmacSecret deve ter ao menos 16 caracteres'),
  allowedCidrs: z.array(z.string()).default(['0.0.0.0/0']),
  isActive: z.boolean().default(true),
})

export const gatewayConfigSchema = z.object({
  defaultVersion: z.string().default('v1'),
  versionHeaders: z
    .object({
      accept: z.string().default('accept-version'),
      explicit: z.string().default('x-api-version'),
    })
    .prefault({}),
  cors: corsConfigSchema.optional(), // CORS global default
  // Consumidores HMAC do gateway (clientes sistema-a-sistema). Estático via config.
  consumers: z.array(consumerConfigSchema).default([]),
  services: z.record(z.string(), serviceConfigSchema),
  routes: z.array(routeConfigSchema),
})

export type UpstreamConfig = z.infer<typeof upstreamConfigSchema>
export type CircuitBreakerConfig = z.infer<typeof circuitBreakerConfigSchema>
export type RetryPolicyConfig = z.infer<typeof retryPolicyConfigSchema>
export type RouteAuthPolicy = z.infer<typeof authPolicySchema>
export type RateLimitRule = z.infer<typeof rateLimitRuleSchema>
export type CorsConfig = z.infer<typeof corsConfigSchema>
export type TransformRef = z.infer<typeof transformRefSchema>
export type VersionMapping = z.infer<typeof versionMappingSchema>
export type RouteConfig = z.infer<typeof routeConfigSchema>
export type ServiceConfig = z.infer<typeof serviceConfigSchema>
export type ConsumerConfig = z.infer<typeof consumerConfigSchema>
export type GatewayConfig = z.infer<typeof gatewayConfigSchema>
export type GatewayConfigInput = z.input<typeof gatewayConfigSchema>
