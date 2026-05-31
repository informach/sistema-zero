import type {
  LoadBalancer,
  UpstreamTarget,
} from '../../../domain/load-balancing/load-balancer.port'
import { resolveVersionMapping } from '../../../domain/versioning/version'
import type { ServiceConfig } from '../../../infrastructure/config/gateway-config.schema'
import { sanitizeRequestHeaders } from '../../../infrastructure/proxy/header-rules'
import type { ProxyEngine } from '../../../infrastructure/proxy/proxy-engine'
import type { Stage } from '../stage.port'

export interface ProxyStageDeps {
  engine: ProxyEngine
  getService: (name: string) => ServiceConfig
  getTargets: (service: string, group: string) => readonly UpstreamTarget[]
  getLoadBalancer: (routeId: string) => LoadBalancer
  via: string
}

/**
 * Stage terminal (Proxy): resolve destinos do grupo de upstream (considerando o
 * mapeamento de versão), monta os headers de saída (X-Forwarded-*, remove
 * hop-by-hop) e delega ao ProxyEngine (LB → breaker → retry → stream).
 */
export function createProxyStage(deps: ProxyStageDeps): Stage {
  return {
    name: 'proxy',
    async run(ctx) {
      const match = ctx.route
      if (!match) return undefined
      const route = match.route
      const service = deps.getService(route.service)

      const mapping = resolveVersionMapping(route.versions, ctx.requestedVersion)
      const group = mapping?.upstreamGroup ?? route.upstreamGroup
      const targets = deps.getTargets(route.service, group)

      const headers = sanitizeRequestHeaders(ctx.upstreamHeaders, {
        clientIp: ctx.clientIp,
        proto: ctx.url.protocol.replace(/:$/, ''),
        host: ctx.url.host,
        requestId: ctx.requestId,
        via: deps.via,
        traceparent: ctx.traceparent,
      })

      const result = await deps.engine.proxy({
        serviceId: route.service,
        targets,
        lb: deps.getLoadBalancer(route.id),
        method: ctx.method,
        path: ctx.upstreamPath,
        headers,
        // Corpo segue como stream (zero-copy). O teto é enforçado pelo
        // `maxRequestBodySize` do Bun.serve — não por pipe (frágil no Bun).
        body: ctx.upstreamBody,
        timeoutMs: route.timeoutMs ?? service.timeoutMs,
        retry: {
          maxRetries: route.retries ?? service.retry.maxRetries,
          baseDelayMs: service.retry.baseDelayMs,
          maxDelayMs: service.retry.maxDelayMs,
          budgetMs: service.retry.budgetMs,
        },
        requestId: ctx.requestId,
      })
      ctx.upstreamTarget = result.targetId
      ctx.attempts = result.attempts
      ctx.response = result.response
      return result.response
    },
  }
}
