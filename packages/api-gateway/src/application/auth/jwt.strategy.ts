import { createRemoteJWKSet, type JWTPayload, type JWTVerifyGetKey, jwtVerify } from 'jose'
import type { AuthStrategy } from './auth-strategy.port'

export interface JwtStrategyOptions {
  /** URL do JWKS remoto (RS256/ES…). O jose cuida do cache/rotação. */
  jwksUrl?: string
  /** Segredo simétrico (HS256) — compartilhado com o emissor (auth service). */
  hs256Secret?: string
  issuer?: string
  audience?: string
  /**
   * Algoritmos aceitos (pin contra alg-confusion/downgrade). Se ausente, deriva
   * das chaves configuradas: `RS256` (JWKS) e/ou `HS256` (segredo).
   */
  algorithms?: readonly string[]
}

function extractScopes(payload: JWTPayload): string[] | undefined {
  const scope = (payload.scope ?? payload.scopes) as unknown
  if (typeof scope === 'string') return scope.split(/\s+/).filter(Boolean)
  if (Array.isArray(scope)) return scope.map(String)
  return undefined
}

/**
 * Strategy JWT: valida o Bearer token. Suporta **HS256** (segredo compartilhado
 * com o emissor interno) e **RS256 via JWKS remoto** (o gateway nunca segura a
 * chave privada). A chave de verificação é escolhida pelo `alg` do header do
 * token; os algoritmos são PINADOS ao conjunto habilitado.
 */
export function createJwtStrategy(opts: JwtStrategyOptions): AuthStrategy {
  const jwks = opts.jwksUrl ? createRemoteJWKSet(new URL(opts.jwksUrl)) : undefined
  const secret = opts.hs256Secret ? new TextEncoder().encode(opts.hs256Secret) : undefined

  if (!jwks && !secret) {
    throw new Error('createJwtStrategy: defina jwksUrl (RS256) e/ou hs256Secret (HS256)')
  }

  const enabled: string[] = []
  if (jwks) enabled.push('RS256')
  if (secret) enabled.push('HS256')
  const algorithms = opts.algorithms && opts.algorithms.length > 0 ? [...opts.algorithms] : enabled

  // Resolve a chave por `alg`: HS* → segredo; assimétrico → JWKS.
  const getKey: JWTVerifyGetKey = (protectedHeader, token) => {
    const alg = protectedHeader.alg ?? ''
    if (alg.startsWith('HS')) {
      if (!secret) throw new Error('Token HS256 mas nenhum segredo HS256 configurado')
      return Promise.resolve(secret)
    }
    if (!jwks) throw new Error('Token assimétrico mas nenhum JWKS configurado')
    return jwks(protectedHeader, token)
  }

  return {
    name: 'jwt',
    async authenticate(ctx) {
      const header = ctx.request.headers.get('authorization')
      if (!header || !/^Bearer\s+/i.test(header)) return { ok: 'skip' }
      const token = header.replace(/^Bearer\s+/i, '').trim()
      if (!token) return { ok: 'skip' }
      try {
        const { payload } = await jwtVerify(token, getKey, {
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
