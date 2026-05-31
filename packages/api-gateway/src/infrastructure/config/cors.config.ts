import type { cors } from '@elysiajs/cors'
import type { CorsConfig } from './gateway-config.schema'

type CorsPluginOptions = NonNullable<Parameters<typeof cors>[0]>
type OriginMatcher = NonNullable<CorsPluginOptions['origin']>

/** Converte uma string de config em matcher de origem: '*'→true, `/re/`→RegExp, senão literal. */
function toOriginMatcher(value: string): string | RegExp | boolean {
  if (value === '*') return true
  if (value.length > 1 && value.startsWith('/') && value.endsWith('/')) {
    return new RegExp(value.slice(1, -1))
  }
  return value
}

/** Monta as opções do plugin `@elysiajs/cors` a partir da config (global ou de rota). */
export function buildCorsPluginOptions(cfg?: CorsConfig): CorsPluginOptions {
  // Sem config: reflete qualquer origem mas SEM credenciais. Refletir origem
  // arbitrária COM credentials é proibido (qualquer site faria leitura autenticada).
  if (!cfg) return { origin: true, credentials: false }

  let origin: OriginMatcher = true
  if (cfg.origins && cfg.origins.length > 0) {
    origin = cfg.origins.includes('*') ? true : (cfg.origins.map(toOriginMatcher) as OriginMatcher)
  }

  const options: CorsPluginOptions = { origin }
  if (cfg.methods) options.methods = cfg.methods as unknown as CorsPluginOptions['methods']
  if (cfg.allowedHeaders) options.allowedHeaders = cfg.allowedHeaders
  if (cfg.exposeHeaders) options.exposeHeaders = cfg.exposeHeaders
  if (cfg.credentials !== undefined) options.credentials = cfg.credentials
  if (cfg.maxAge !== undefined) options.maxAge = cfg.maxAge
  return options
}

/**
 * Verifica se a `origin` é permitida pela lista da rota. Requisições sem header
 * `Origin` (não-CORS, ex.: sistema-a-sistema) NÃO são rejeitadas.
 */
export function isOriginAllowed(origin: string | null, origins?: readonly string[]): boolean {
  if (!origin) return true
  if (!origins || origins.length === 0 || origins.includes('*')) return true
  return origins.some((o) => {
    const m = toOriginMatcher(o)
    if (m === true) return true
    if (m instanceof RegExp) return m.test(origin)
    return m === origin
  })
}
