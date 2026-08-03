import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Env } from './env'
import { type GatewayConfig, gatewayConfigSchema } from './gateway-config.schema'

export interface LoadGatewayConfigOptions {
  /** Tipos de transform conhecidos (chaves do registry) — valida refs na config. */
  validTransformTypes?: readonly string[]
}

/**
 * Carrega e valida a config declarativa do gateway (fail-fast no boot).
 * Origem (precedência): `raw` (testes) → `GATEWAY_CONFIG_JSON` (inline) →
 * `GATEWAY_CONFIG_PATH` (módulo .ts com `export default`).
 */
export async function loadGatewayConfig(
  env: Env,
  raw?: unknown,
  opts: LoadGatewayConfigOptions = {},
): Promise<GatewayConfig> {
  const source = raw ?? (await loadRawConfig(env))
  const parsed = gatewayConfigSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Config do gateway inválida:\n${issues}`)
  }
  validateReferences(parsed.data, env, opts.validTransformTypes)
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
function validateReferences(
  config: GatewayConfig,
  env: Env,
  validTransformTypes?: readonly string[],
): void {
  const problems: string[] = []
  let usesJwt = false
  let usesResign = false
  const seenRouteIds = new Set<string>()
  const knownTransforms = validTransformTypes ? new Set(validTransformTypes) : undefined

  for (const route of config.routes) {
    if (seenRouteIds.has(route.id)) {
      problems.push(`rota com id duplicado: "${route.id}" (cada rota precisa de um id único)`)
    }
    seenRouteIds.add(route.id)

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
    validateRouteTransforms(route, knownTransforms, problems)
    // maxBodyBytes maior que o teto global seria mentira: o `maxRequestBodySize`
    // do Bun.serve mata a requisição antes (413) e o valor da rota nunca valeria.
    if (route.maxBodyBytes !== undefined && route.maxBodyBytes > env.MAX_REQUEST_BODY_BYTES) {
      problems.push(
        `rota "${route.id}": maxBodyBytes (${route.maxBodyBytes}) excede MAX_REQUEST_BODY_BYTES ` +
          `(${env.MAX_REQUEST_BODY_BYTES}) — o teto do servidor venceria; suba a env ou reduza a rota`,
      )
    }
    // Auditoria só faz sentido em rota MUTANTE: todo método declarado para uma rota
    // auditada precisa representar ação de mudança de estado.
    if (route.audit) {
      const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE']
      const nonMutating = route.methods.filter((m) => !MUTATING.includes(m))
      if (nonMutating.length > 0) {
        problems.push(
          `rota "${route.id}": audit exige apenas métodos mutantes ` +
            `(POST/PUT/PATCH/DELETE); métodos não mutantes: ${nonMutating.join(', ')}`,
        )
      }
    }
    if (route.rateLimit?.by === 'json-field') {
      const hmacAuthenticated =
        route.auth !== 'public' &&
        route.auth.required &&
        route.auth.strategies.includes('hmac') &&
        (route.auth.mode === 'all' || route.auth.strategies.length === 1)
      if (!hmacAuthenticated) {
        problems.push(
          `rota "${route.id}": rateLimit by=json-field exige corpo autenticado por HMAC`,
        )
      }
      const methodsWithoutBody = route.methods.filter(
        (method) => !['POST', 'PUT', 'PATCH'].includes(method),
      )
      if (methodsWithoutBody.length > 0) {
        problems.push(
          `rota "${route.id}": rateLimit by=json-field exige método com corpo; inválidos: ${methodsWithoutBody.join(', ')}`,
        )
      }
    }
    if (route.auth !== 'public' && route.auth.strategies.includes('jwt')) usesJwt = true
    if (route.upstreamAuth === 'resign') usesResign = true
  }

  if (usesJwt && !env.JWT_JWKS_URL?.trim() && !env.JWT_HS256_SECRET?.trim()) {
    problems.push(
      'alguma rota usa auth "jwt" mas nem JWT_JWKS_URL (RS256) nem JWT_HS256_SECRET (HS256) estão definidos',
    )
  }
  // Em produção, verificar assinatura sem amarrar emissor/audiência aceitaria
  // qualquer token assinado com a mesma chave para outro contexto/audiência.
  if (
    usesJwt &&
    env.NODE_ENV === 'production' &&
    !(env.JWT_ISSUER?.trim() && env.JWT_AUDIENCE?.trim())
  ) {
    problems.push(
      'em produção, rotas com auth "jwt" exigem JWT_ISSUER e JWT_AUDIENCE (devem casar com o emissor @sistemazero/auth)',
    )
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

/** Valida os transforms de uma rota: tipo conhecido + valores injetados não vazios. */
function validateRouteTransforms(
  route: GatewayConfig['routes'][number],
  knownTransforms: ReadonlySet<string> | undefined,
  problems: string[],
): void {
  for (const ref of route.transforms) {
    const type = typeof ref === 'string' ? ref : ref.type
    if (knownTransforms && !knownTransforms.has(type)) {
      problems.push(`rota "${route.id}": transform "${type}" desconhecido`)
      continue
    }
    // header-inject com valor vazio = header de confiança silenciosamente desativado.
    if (typeof ref !== 'string' && type === 'header-inject') {
      const headers = ref.options?.headers
      if (headers && typeof headers === 'object') {
        for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
          if (typeof value !== 'string' || value.length === 0) {
            problems.push(
              `rota "${route.id}": header-inject "${name}" tem valor vazio (defina a variável de ambiente correspondente)`,
            )
          }
        }
      }
    }
  }
}
