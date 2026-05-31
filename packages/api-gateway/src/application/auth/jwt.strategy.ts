import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose'
import type { AuthStrategy } from './auth-strategy.port'

export interface JwtStrategyOptions {
  jwksUrl: string
  issuer?: string
  audience?: string
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
  return {
    name: 'jwt',
    async authenticate(ctx) {
      const header = ctx.request.headers.get('authorization')
      if (!header || !/^Bearer\s+/i.test(header)) return { ok: 'skip' }
      const token = header.replace(/^Bearer\s+/i, '').trim()
      if (!token) return { ok: 'skip' }
      try {
        const { payload } = await jwtVerify(token, jwks, {
          ...(opts.issuer ? { issuer: opts.issuer } : {}),
          ...(opts.audience ? { audience: opts.audience } : {}),
        })
        return {
          ok: true,
          principal: {
            kind: 'jwt',
            subject: payload.sub ?? 'unknown',
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
