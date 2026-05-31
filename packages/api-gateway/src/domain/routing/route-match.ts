import type { RouteConfig } from '../../infrastructure/config/gateway-config.schema'

/** Resultado da resolução de rota: a rota casada, params capturados e versão negociada. */
export interface RouteMatch {
  readonly route: RouteConfig
  readonly params: Readonly<Record<string, string>>
  readonly version: string
}

/** Porta: resolve (método, caminho, versão) → rota. Implementada pela RouteRegistry. */
export interface RouteResolver {
  resolve(method: string, path: string, version: string): RouteMatch | undefined
}
