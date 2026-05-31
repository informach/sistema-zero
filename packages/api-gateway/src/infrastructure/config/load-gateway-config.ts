import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Env } from './env'
import { type GatewayConfig, gatewayConfigSchema } from './gateway-config.schema'

/**
 * Carrega e valida a config declarativa do gateway (fail-fast no boot).
 * Origem (precedência): `raw` (testes) → `GATEWAY_CONFIG_JSON` (inline) →
 * `GATEWAY_CONFIG_PATH` (módulo .ts com `export default`).
 */
export async function loadGatewayConfig(env: Env, raw?: unknown): Promise<GatewayConfig> {
  const source = raw ?? (await loadRawConfig(env))
  const parsed = gatewayConfigSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Config do gateway inválida:\n${issues}`)
  }
  validateReferences(parsed.data, env)
  return parsed.data
}

async function loadRawConfig(env: Env): Promise<unknown> {
  if (env.GATEWAY_CONFIG_JSON?.trim()) {
    try {
      return JSON.parse(env.GATEWAY_CONFIG_JSON)
    } catch (error) {
      throw new Error(`GATEWAY_CONFIG_JSON não é um JSON válido: ${(error as Error).message}`)
    }
  }
  const absolute = resolve(process.cwd(), env.GATEWAY_CONFIG_PATH)
  const mod = (await import(pathToFileURL(absolute).href)) as Record<string, unknown>
  return mod.default ?? mod.config ?? mod
}

/** Validações cruzadas que dependem da config inteira e do ambiente. */
function validateReferences(config: GatewayConfig, env: Env): void {
  const problems: string[] = []
  let usesJwt = false
  let usesResign = false

  for (const route of config.routes) {
    const service = config.services[route.service]
    if (!service) {
      problems.push(`rota "${route.id}": serviço "${route.service}" não existe em services`)
      continue
    }
    if (!service.upstreamGroups[route.upstreamGroup]) {
      problems.push(
        `rota "${route.id}": upstreamGroup "${route.upstreamGroup}" não existe no serviço "${route.service}"`,
      )
    }
    for (const v of route.versions ?? []) {
      const group = v.upstreamGroup ?? route.upstreamGroup
      if (!service.upstreamGroups[group]) {
        problems.push(
          `rota "${route.id}" versão "${v.version}": upstreamGroup "${group}" inexistente`,
        )
      }
    }
    if (route.auth !== 'public' && route.auth.strategies.includes('jwt')) usesJwt = true
    if (route.upstreamAuth === 'resign') usesResign = true
  }

  if (usesJwt && !env.JWT_JWKS_URL?.trim()) {
    problems.push('alguma rota usa auth "jwt" mas JWT_JWKS_URL não está definido')
  }
  if (usesResign && !(env.GATEWAY_CONSUMER_ID?.trim() && env.GATEWAY_HMAC_SECRET?.trim())) {
    problems.push(
      'alguma rota usa upstreamAuth="resign" mas GATEWAY_CONSUMER_ID/GATEWAY_HMAC_SECRET ausentes',
    )
  }

  if (problems.length > 0) {
    throw new Error(
      `Config do gateway inconsistente:\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    )
  }
}
