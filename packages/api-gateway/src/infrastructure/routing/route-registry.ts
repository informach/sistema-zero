import type { RouteMatch, RouteResolver } from '../../domain/routing/route-match'
import type { RouteConfig } from '../config/gateway-config.schema'

type Segment =
  | { readonly kind: 'static'; readonly value: string }
  | { readonly kind: 'param'; readonly name: string }
  | { readonly kind: 'wildcard' }

interface CompiledRoute {
  readonly route: RouteConfig
  readonly segments: readonly Segment[]
  readonly methods: ReadonlySet<string>
  readonly specificity: number
}

function compilePattern(pattern: string): Segment[] {
  return pattern
    .split('/')
    .filter((s) => s.length > 0)
    .map((s): Segment => {
      if (s === '*') return { kind: 'wildcard' }
      if (s.startsWith(':')) return { kind: 'param', name: s.slice(1) }
      return { kind: 'static', value: s }
    })
}

function specificityOf(segments: readonly Segment[]): number {
  // Estáticos contam mais que params, params mais que wildcard; rotas mais longas
  // (mais segmentos) ganham desempate → "longest-prefix" estável.
  let score = 0
  for (const seg of segments)
    score = score * 4 + (seg.kind === 'static' ? 3 : seg.kind === 'param' ? 2 : 1)
  return score
}

function tryMatch(
  segments: readonly Segment[],
  pathSegs: readonly string[],
): Record<string, string> | undefined {
  const params: Record<string, string> = {}
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (!seg) return undefined
    if (seg.kind === 'wildcard') {
      params['*'] = pathSegs.slice(i).join('/')
      return params
    }
    const part = pathSegs[i]
    if (part === undefined) return undefined
    if (seg.kind === 'static') {
      if (seg.value !== part) return undefined
    } else {
      params[seg.name] = decodeURIComponent(part)
    }
  }
  // Sem wildcard: o caminho precisa ter exatamente o mesmo nº de segmentos.
  return pathSegs.length === segments.length ? params : undefined
}

/**
 * Tabela de rotas compilada (Facade sobre os serviços). Casa por método +
 * longest-prefix. A versão já vem negociada (o stage de versão remove o `/vN`).
 */
export class RouteRegistry implements RouteResolver {
  private readonly compiled: readonly CompiledRoute[]

  constructor(routes: readonly RouteConfig[]) {
    this.compiled = routes
      .map((route): CompiledRoute => {
        const segments = compilePattern(route.pathPattern)
        return {
          route,
          segments,
          methods: new Set(route.methods),
          specificity: specificityOf(segments),
        }
      })
      .sort((a, b) => b.specificity - a.specificity)
  }

  resolve(method: string, path: string, version: string): RouteMatch | undefined {
    const pathSegs = path.split('/').filter((s) => s.length > 0)
    const upper = method.toUpperCase()
    for (const c of this.compiled) {
      if (!c.methods.has(upper)) continue
      const params = tryMatch(c.segments, pathSegs)
      if (params) return { route: c.route, params, version }
    }
    return undefined
  }
}
