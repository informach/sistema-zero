import { createLogger, type Logger } from '@sistemazero/core/logging'
import { type AuthStrategyMap, createAuthChain } from './application/auth/auth-chain'
import { createHmacStrategy } from './application/auth/hmac.strategy'
import { createJwtStrategy } from './application/auth/jwt.strategy'
import { createSessionStrategy } from './application/auth/session.strategy'
import { createPipeline, type Pipeline } from './application/pipeline/pipeline'
import { createAuthStage } from './application/pipeline/stages/auth.stage'
import { createCorsStage } from './application/pipeline/stages/cors.stage'
import { createFinalizeStage } from './application/pipeline/stages/finalize.stage'
import { createProxyStage } from './application/pipeline/stages/proxy.stage'
import { createRateLimitStage } from './application/pipeline/stages/rate-limit.stage'
import { createRequestTransformStage } from './application/pipeline/stages/request-transform.stage'
import { createResponseTransformStage } from './application/pipeline/stages/response-transform.stage'
import { createRouteResolveStage } from './application/pipeline/stages/route-resolve.stage'
import { createRateLimiter } from './application/rate-limit/rate-limiter'
import { buildTransformers } from './application/transform/transform-chain'
import type { Transformer } from './application/transform/transformer.port'
import { defaultTransformerRegistry } from './application/transform/transformers/index'
import type { LoadBalancer, UpstreamTarget } from './domain/load-balancing/load-balancer.port'
import type { GatewayStore } from './domain/ports/gateway-store.port'
import type { Forwarder } from './domain/proxy/forwarder.port'
import type { Env } from './infrastructure/config/env'
import type { ServiceConfig } from './infrastructure/config/gateway-config.schema'
import { loadGatewayConfig } from './infrastructure/config/load-gateway-config'
import { createLoadBalancer } from './infrastructure/load-balancing/load-balancer.factory'
import { UpstreamStats } from './infrastructure/load-balancing/upstream-stats'
import { MetricsRegistry } from './infrastructure/observability/metrics-registry'
import { createFetchForwarder } from './infrastructure/proxy/fetch-forwarder'
import { ProxyEngine } from './infrastructure/proxy/proxy-engine'
import {
  ActiveHealthProbe,
  type ProbeTarget,
} from './infrastructure/resilience/active-health-probe'
import { InMemoryHealthRegistry } from './infrastructure/resilience/health-registry'
import { StoreCircuitBreaker } from './infrastructure/resilience/store-circuit-breaker'
import { createStaticConsumerRepository } from './infrastructure/routing/consumer-registry'
import { RouteRegistry } from './infrastructure/routing/route-registry'
import { createInMemoryStore } from './infrastructure/store/in-memory-store'
import { createRedisStore } from './infrastructure/store/redis-store'
import { createResigner, type Resigner } from './infrastructure/upstream/resign.transformer'
import { createGatewayApp } from './interfaces/http/gateway-plugin'

export interface Application {
  logger: Logger
  handle(request: Request): Promise<Response>
  start(): Promise<void>
  stop(): Promise<void>
}

export interface CreateApplicationOptions {
  /** Config bruta (para testes); senão é carregada de GATEWAY_CONFIG_*. */
  rawConfig?: unknown
  /** Store sobrescrito (testes). */
  store?: GatewayStore
  /** Forwarder sobrescrito (testes — stub do upstream). */
  forwarder?: Forwarder
}

/**
 * Composition root: instancia e conecta TUDO (store, LB, breaker, auth, transforms,
 * pipeline, server) num único lugar. Sem container de DI — fábrica pura.
 */
export async function createApplication(
  env: Env,
  opts: CreateApplicationOptions = {},
): Promise<Application> {
  const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV !== 'production' })
  const config = await loadGatewayConfig(env, opts.rawConfig, {
    validTransformTypes: Object.keys(defaultTransformerRegistry),
  })

  const store =
    opts.store ??
    (env.STATE_BACKEND === 'redis' && env.REDIS_URL
      ? createRedisStore(env.REDIS_URL)
      : createInMemoryStore())
  const rateLimiter = createRateLimiter(store)
  const health = new InMemoryHealthRegistry()
  const stats = new UpstreamStats()
  const breaker = new StoreCircuitBreaker(store, (svc) => config.services[svc]?.circuitBreaker)
  const forwarder = opts.forwarder ?? createFetchForwarder()
  const engine = new ProxyEngine({ forwarder, health, stats, breaker, logger })
  const metrics = new MetricsRegistry()

  // Destinos por (serviço:grupo) + alvos de probe + ids.
  const targetsByGroup = new Map<string, UpstreamTarget[]>()
  const probeTargets: ProbeTarget[] = []
  const allTargetIds: string[] = []
  for (const [serviceName, service] of Object.entries(config.services)) {
    for (const [group, upstreams] of Object.entries(service.upstreamGroups)) {
      const targets = upstreams.map((u, i): UpstreamTarget => {
        const id = u.id ?? `${serviceName}:${group}#${i}`
        return { id, baseUrl: u.url, weight: u.weight }
      })
      targetsByGroup.set(`${serviceName}:${group}`, targets)
      upstreams.forEach((u, i) => {
        const id = u.id ?? `${serviceName}:${group}#${i}`
        probeTargets.push({ id, baseUrl: u.url, healthCheckPath: u.healthCheckPath })
        allTargetIds.push(id)
      })
    }
  }

  // LB + transformers por rota (instâncias persistentes entre requisições).
  const lbByRoute = new Map<string, LoadBalancer>()
  const transformersByRoute = new Map<string, Transformer[]>()
  for (const route of config.routes) {
    const lbName = route.lb ?? config.services[route.service]?.loadBalancer ?? 'round-robin'
    lbByRoute.set(route.id, createLoadBalancer(lbName, Boolean(route.sticky)))
    transformersByRoute.set(
      route.id,
      buildTransformers(route.transforms, defaultTransformerRegistry),
    )
  }

  // Cadeia de auth (estratégias plugáveis).
  const consumers = createStaticConsumerRepository(config.consumers)
  const strategies: AuthStrategyMap = {
    hmac: createHmacStrategy({ consumers, toleranceSeconds: env.HMAC_TOLERANCE_SECONDS }),
    session: createSessionStrategy(store),
  }
  if (env.JWT_JWKS_URL) {
    strategies.jwt = createJwtStrategy({
      jwksUrl: env.JWT_JWKS_URL,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: env.JWT_ALGORITHMS,
    })
  }
  const authChain = createAuthChain(strategies)

  let resigner: Resigner | undefined
  if (env.GATEWAY_CONSUMER_ID && env.GATEWAY_HMAC_SECRET) {
    resigner = createResigner({
      consumerId: env.GATEWAY_CONSUMER_ID,
      secret: env.GATEWAY_HMAC_SECRET,
    })
  }

  const resolver = new RouteRegistry(config.routes)
  const getService = (name: string): ServiceConfig => {
    const s = config.services[name]
    if (!s) throw new Error(`Serviço "${name}" não configurado`)
    return s
  }
  const getTargets = (service: string, group: string): readonly UpstreamTarget[] =>
    targetsByGroup.get(`${service}:${group}`) ?? []
  const getLoadBalancer = (routeId: string): LoadBalancer =>
    lbByRoute.get(routeId) ?? createLoadBalancer('round-robin')
  const getTransformers = (routeId: string): readonly Transformer[] =>
    transformersByRoute.get(routeId) ?? []

  const stages = [
    createRouteResolveStage({
      resolver,
      defaultVersion: config.defaultVersion,
      versionHeaders: config.versionHeaders,
      maxBodyBytes: env.MAX_REQUEST_BODY_BYTES,
    }),
    createCorsStage(),
    createAuthStage(authChain),
    createRateLimitStage({
      rateLimiter,
      defaultMax: env.RATE_LIMIT_PER_MINUTE,
      defaultWindowMs: env.RATE_LIMIT_WINDOW_MS,
    }),
    createRequestTransformStage({ getTransformers, resigner }),
    createProxyStage({
      engine,
      getService,
      getTargets,
      getLoadBalancer,
      via: '1.1 sistemazero-gateway',
    }),
  ]
  const finalizers = [
    createResponseTransformStage({ getTransformers }),
    createFinalizeStage(rateLimiter, metrics),
  ]
  const pipeline: Pipeline = createPipeline(stages, finalizers)

  const lifecycle = { draining: false }
  const app = createGatewayApp({
    env,
    logger,
    pipeline,
    corsConfig: config.cors,
    health,
    store,
    metrics,
    targetIds: allTargetIds,
    getDraining: () => lifecycle.draining,
  })

  const probe = new ActiveHealthProbe(probeTargets, health, env.HEALTH_PROBE_INTERVAL_MS, logger)

  return {
    logger,
    handle: (request) => app.handle(request),
    async start() {
      await store.init()
      probe.start()
      app.listen(env.PORT)
      logger.info('gateway.listening', {
        port: env.PORT,
        services: Object.keys(config.services).length,
        routes: config.routes.length,
        stateBackend: env.STATE_BACKEND,
      })
    },
    async stop() {
      // Drain: /readyz vira 503 → o LB para de mandar tráfego novo; aguarda o
      // grace para as requisições em voo terminarem antes de parar o servidor.
      lifecycle.draining = true
      if (env.SHUTDOWN_DRAIN_MS > 0) await Bun.sleep(env.SHUTDOWN_DRAIN_MS)
      probe.stop()
      // Só para o servidor se ele chegou a escutar (app.handle em testes não escuta).
      if (app.server) {
        try {
          await app.stop()
        } catch (error) {
          logger.debug('gateway.stop_skipped', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      await store.kill()
    },
  }
}
