import type { RouteResolver } from '../../../domain/routing/route-match'
import {
  normalizeVersion,
  parseRequestedVersion,
  resolveVersionMapping,
  stripVersionPrefix,
  type VersionHeaders,
} from '../../../domain/versioning/version'
import type { RouteConfig } from '../../../infrastructure/config/gateway-config.schema'
import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'

export interface RouteResolveDeps {
  resolver: RouteResolver
  defaultVersion: string
  versionHeaders: VersionHeaders
  maxBodyBytes: number
}

/** Prefixo estático inicial do pattern (até o 1º `:param` ou `*`). */
function staticPrefixOf(pattern: string): string {
  const out: string[] = []
  for (const s of pattern.split('/').filter(Boolean)) {
    if (s.startsWith(':') || s === '*') break
    out.push(s)
  }
  return out.length ? `/${out.join('/')}` : ''
}

function applyRoutePathRewrite(
  route: RouteConfig,
  basePath: string,
  versionRewritePrefix?: string,
): string {
  let path = basePath
  if (route.stripPrefix) {
    const prefix = staticPrefixOf(route.pathPattern)
    if (prefix && path.startsWith(prefix)) path = path.slice(prefix.length) || '/'
  }
  // O mapeamento da VERSÃO pedida pode sobrepor o prefixo da rota (ex.: v2 vive
  // sob outro path no upstream).
  const rewritePrefix = versionRewritePrefix ?? route.rewritePrefix
  if (rewritePrefix) {
    const base = path.startsWith('/') ? path : `/${path}`
    path = `${rewritePrefix.replace(/\/$/, '')}${base}`
  }
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * Resolve método+versão+caminho → rota (Facade sobre os serviços). Nega payloads
 * acima do teto (413) e rotas inexistentes (404). Negocia a versão (path/header)
 * e calcula o caminho de saída inicial.
 */
export function createRouteResolveStage(deps: RouteResolveDeps): Stage {
  return {
    name: 'route-resolve',
    run(ctx) {
      const declared = Number(ctx.request.headers.get('content-length') ?? '0')
      if (Number.isFinite(declared) && declared > deps.maxBodyBytes) {
        return errorResponse(
          413,
          'PAYLOAD_TOO_LARGE',
          'Corpo da requisição excede o limite permitido',
        )
      }

      const { version, fromPath } = parseRequestedVersion(
        ctx.url.pathname,
        ctx.request.headers,
        deps.versionHeaders,
        deps.defaultVersion,
      )
      ctx.requestedVersion = version
      ctx.versionFromPath = fromPath

      const basePath = fromPath ? stripVersionPrefix(ctx.url.pathname) : ctx.url.pathname
      const match = deps.resolver.resolve(ctx.method, basePath, version)
      if (!match) return errorResponse(404, 'NOT_FOUND', 'Rota não encontrada')

      // Se a rota declara versões, a pedida precisa existir (falha alto).
      const versions = match.route.versions
      const mapping = resolveVersionMapping(versions, version)
      if (versions && versions.length > 0 && !mapping) {
        return errorResponse(
          400,
          'UNSUPPORTED_VERSION',
          `Versão "${version}" não suportada para esta rota`,
        )
      }
      // Rota SEM versões declaradas só atende a versão default — servir `/v9/...`
      // silenciosamente como default faria o cliente acreditar que a v9 existe.
      if (
        (!versions || versions.length === 0) &&
        normalizeVersion(version) !== normalizeVersion(deps.defaultVersion)
      ) {
        return errorResponse(
          400,
          'UNSUPPORTED_VERSION',
          `Versão "${version}" não suportada para esta rota`,
        )
      }

      // Teto de corpo POR ROTA (afina o global, já checado acima). Vale para o
      // Content-Length declarado; chunked é capado pelo maxRequestBodySize global.
      const routeCap = match.route.maxBodyBytes
      if (routeCap !== undefined && Number.isFinite(declared) && declared > routeCap) {
        return errorResponse(
          413,
          'PAYLOAD_TOO_LARGE',
          'Corpo da requisição excede o limite permitido',
        )
      }

      ctx.route = match
      ctx.upstreamPath = `${applyRoutePathRewrite(match.route, basePath, mapping?.rewritePrefix)}${ctx.url.search}`
      return undefined
    },
  }
}
