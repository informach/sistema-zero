import {
  desktopMayAccess,
  parseDesktopSessionClaim,
  parseKidsSessionClaim,
} from '@sistemazero/core/security'
import { createRemoteJWKSet, type JWTPayload, type JWTVerifyGetKey, jwtVerify } from 'jose'
import type { AuthStrategy } from './auth-strategy.port'
import { kidsMayAccess } from './kids-access-policy'

export interface JwtStrategyOptions {
  validateDesktopSession?: (token: string) => Promise<boolean>
  /** Introspecção sem cache: revogação infantil e saída adulta valem imediatamente. */
  validateKidsSession?: (token: string) => Promise<boolean>
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
        if (payload.pfl && !payload.kids && !payload.act)
          return {
            ok: false,
            status: 401,
            code: 'KIDS_LOGIN_REQUIRED',
            message: 'Entre pelo novo acesso de aluno.',
          }
        if (payload.desktop !== undefined) {
          const desktop = parseDesktopSessionClaim(payload.desktop)
          if (!desktop || payload.typ !== 'access' || payload.kids || payload.pfl || payload.act)
            return {
              ok: false,
              status: 401,
              code: 'INVALID_TOKEN',
              message: 'Sessão desktop inválida.',
            }
          if (!desktopMayAccess(ctx.upstreamPath, ctx.method))
            return {
              ok: false,
              status: 403,
              code: 'DESKTOP_CONTEXT_FORBIDDEN',
              message: 'Esta sessão é exclusiva do Marketing.',
            }
          let valid = false
          try {
            valid = (await opts.validateDesktopSession?.(token)) ?? false
          } catch {
            return {
              ok: false,
              status: 503,
              code: 'AUTH_UNAVAILABLE',
              message: 'Não foi possível conferir o acesso agora.',
            }
          }
          if (!valid)
            return {
              ok: false,
              status: 401,
              code: 'DEVICE_REVOKED',
              message: 'Computador desconectado. Conecte novamente.',
            }
        }
        if (payload.kids !== undefined) {
          const kids = parseKidsSessionClaim(payload.kids)
          if (!kids)
            return {
              ok: false,
              status: 401,
              code: 'INVALID_TOKEN',
              message: 'Acesso encerrado ou vencido.',
            }
          // ⚠️ A política vem ANTES da ida ao Auth: pedido fora da área do público não custa
          // uma introspecção (nem derruba o Auth num flood de rotas proibidas).
          if (
            !kidsMayAccess(
              kids,
              ctx.upstreamPath.split('?')[0] ?? ctx.url.pathname,
              ctx.method,
              payload.sub,
            )
          )
            return {
              ok: false,
              status: 403,
              code: 'KIDS_CONTEXT_FORBIDDEN',
              message: 'Esta ação não pertence à sua área.',
            }
          let valid = false
          try {
            valid = (await opts.validateKidsSession?.(token)) ?? false
          } catch {
            return {
              ok: false,
              status: 503,
              code: 'AUTH_UNAVAILABLE',
              message: 'Não foi possível conferir o acesso agora. Tente novamente.',
            }
          }
          if (!valid)
            return {
              ok: false,
              status: 401,
              code: 'INVALID_TOKEN',
              message: 'Acesso encerrado ou vencido.',
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
