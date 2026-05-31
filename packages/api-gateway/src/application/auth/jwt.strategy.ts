import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose'
import type { AuthStrategy } from './auth-strategy.port'

export interface JwtStrategyOptions {
  jwksUrl: string
  issuer?: string
  audience?: string
  /** Algoritmos aceitos (pin). Default: ['RS256']. Restringe a alg-confusion/downgrade. */
  algorithms?: readonly string[]
}

function extractScopes(payload: JWTPayload): string[] | undefined {
  const scope = (payload.scope ?? payload.scopes) as unknown
  if (typeof scope === 'string') return scope.split(/\s+/).filter(Boolean)
  if (Array.isArray(scope)) return scope.map(String)
  return undefined
}

/**
 * Strategy JWT: valida Bearer token via JWKS remoto (jose cuda do cache/rotação).
 * O gateway só VERIFICA tokens de terceiros (não emite) → JWKS assimétrico.
 */
export function createJwtStrategy(opts: JwtStrategyOptions): AuthStrategy {
  const jwks = createRemoteJWKSet(new URL(opts.jwksUrl))
  const algorithms =
    opts.algorithms && opts.algorithms.length > 0 ? [...opts.algorithms] : ['RS256']
  return {
    name: 'jwt',
    async authenticate(ctx) {
      const header = ctx.request.headers.get('authorization')
      if (!header || !/^Bearer\s+/i.test(header)) return { ok: 'skip' }
      const token = header.replace(/^Bearer\s+/i, '').trim()
      if (!token) return { ok: 'skip' }
      try {
        const { payload } = await jwtVerify(token, jwks, {
          algorithms,
          ...(opts.issuer ? { issuer: opts.issuer } : {}),
          ...(opts.audience ? { audience: opts.audience } : {}),
        })
        // Um token sem `sub` não tem identidade — rejeita (não colapsa para 'unknown',
        // o que mesclaria chamadores distintos na mesma chave de rate-limit/auditoria).
        if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
          return {
            ok: false,
            status: 401,
            code: 'INVALID_TOKEN',
            message: 'Token JWT sem subject (sub)',
          }
        }
        return {
          ok: true,
          principal: {
            kind: 'jwt',
            subject: payload.sub,
            claims: payload as Record<string, unknown>,
            scopes: extractScopes(payload),
          },
        }
      } catch {
        return {
          ok: false,
          status: 401,
          code: 'INVALID_TOKEN',
          message: 'Token JWT inválido ou expirado',
        }
      }
    },
  }
}
