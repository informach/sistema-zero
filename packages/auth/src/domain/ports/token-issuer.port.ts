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

/**
 * Claim de PERFIL (estilo Netflix): presente quando a sessão é de um perfil de
 * criança — `sub` do token = id do PERFIL (vira o `x-auth-user-id` efetivo, atribui
 * progresso/comunidade ao perfil); `accountId` = conta do responsável (vira o
 * `x-auth-account-id`, usado p/ resolver o ACESSO/entitlement). `name` é o nome do
 * perfil (a UI exibe em vez do nome da conta). Identidade/role/status do token são
 * herdados da CONTA (o perfil não tem e-mail/papel próprios).
 */
export interface ProfileClaim {
  accountId: string
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
  /** Sessão de perfil (responsável agindo como um perfil de criança). `sub` = profileId. */
  pfl?: ProfileClaim
}

/** Contexto opcional do access token: impersonação (`act`) e/ou sessão de perfil. */
export interface IssueAccessTokenOptions {
  act?: ActClaim
  /** Sessão de perfil: sobrescreve `sub` por `profileId` e adiciona a claim `pfl`. */
  profile?: { profileId: string; accountId: string; name?: string }
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
  /**
   * Assina um access token com as claims do usuário. `opts.act` = impersonação;
   * `opts.profile` = sessão de perfil (o `sub` vira o profileId e a claim `pfl`
   * carrega a conta + nome do perfil; identidade/role/status seguem do `user`).
   */
  issueAccessToken(
    user: UserAggregate,
    opts?: IssueAccessTokenOptions,
  ): Promise<{ token: string; expiresInSeconds: number }>
  /** Verifica/decodifica um access token. Retorna as claims, ou `null` se inválido/expirado. */
  verifyAccessToken(token: string): Promise<AccessTokenClaims | null>
  /** JWKS público para verificação por terceiros (gateway). Vazio quando HS256. */
  jwks(): JsonWebKeySet
}
