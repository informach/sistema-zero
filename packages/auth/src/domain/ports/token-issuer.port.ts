import type { UserAggregate } from '../user/user.aggregate'

/**
 * Claim de ATOR (RFC 8693 `act`): presente quando a sessão é de IMPERSONAÇÃO —
 * `sub` do token = usuário-alvo; `act.sub` = admin que está navegando como ele.
 * `email`/`name` são do ATOR (exibição no banner da community e auditoria).
 */
export interface ActClaim {
  sub: string
  email?: string
  name?: string
}

/** Claims de identidade carregadas no access token (lidas pelo gateway p/ resolver o usuário). */
export interface AccessTokenClaims {
  sub: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone?: string
  signupSource?: string
  /** Sessão de impersonação (admin navegando como o usuário). Ausente = sessão normal. */
  act?: ActClaim
}

/** Conjunto de chaves públicas (JWKS) para verificação externa (RS256). Vazio em HS256. */
export interface JsonWebKeySet {
  keys: Record<string, unknown>[]
}

/**
 * Emissão e verificação de access tokens (JWT). HS256 (segredo compartilhado) ou
 * RS256 (par de chaves; pública exposta via JWKS — o gateway nunca segura a privada).
 */
export interface TokenIssuer {
  /** Assina um access token com as claims do usuário (+ `act` em impersonação). */
  issueAccessToken(
    user: UserAggregate,
    act?: ActClaim,
  ): Promise<{ token: string; expiresInSeconds: number }>
  /** Verifica/decodifica um access token. Retorna as claims, ou `null` se inválido/expirado. */
  verifyAccessToken(token: string): Promise<AccessTokenClaims | null>
  /** JWKS público para verificação por terceiros (gateway). Vazio quando HS256. */
  jwks(): JsonWebKeySet
}
