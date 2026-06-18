import { type JWTPayload, jwtVerify, SignJWT } from 'jose'
import type {
  AccessTokenClaims,
  ActClaim,
  IssueAccessTokenOptions,
  ProfileClaim,
  TokenIssuer,
} from '../../domain/ports/token-issuer.port'
import type { UserAggregate } from '../../domain/user/user.aggregate'
import type { SigningMaterial } from './keys'

export interface JoseTokenIssuerOptions {
  signing: SigningMaterial
  issuer: string
  audience: string
  accessTtlSeconds: number
}

/**
 * Emissor de access tokens com `jose`. Embute a identidade nas claims (o gateway
 * resolve o usuário direto do token verificado) e PINA o algoritmo na verificação
 * (anti alg-confusion). HS256 ou RS256 conforme o material de assinatura.
 */
export function createJoseTokenIssuer(opts: JoseTokenIssuerOptions): TokenIssuer {
  const { signing, issuer, audience, accessTtlSeconds } = opts

  return {
    async issueAccessToken(user: UserAggregate, opts?: IssueAccessTokenOptions) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const claims: Record<string, unknown> = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        typ: 'access',
      }
      if (user.phone) claims.phone = user.phone
      if (user.signupSource) claims.signupSource = user.signupSource
      // Impersonação (RFC 8693): `sub` = alvo; `act.sub` = admin navegando como ele.
      if (opts?.act) claims.act = opts.act
      // Sessão de perfil: `sub` = profileId; `pfl.accountId` = conta (x-auth-account-id).
      // A identidade/role/status seguem do `user` (a CONTA) — o perfil só herda.
      if (opts?.profile) {
        const pfl: ProfileClaim = { accountId: opts.profile.accountId }
        if (opts.profile.name) pfl.name = opts.profile.name
        claims.pfl = pfl
      }
      const subject = opts?.profile?.profileId ?? user.id

      const header: { alg: string; kid?: string } = { alg: signing.alg }
      if (signing.kid) header.kid = signing.kid

      const token = await new SignJWT(claims)
        .setProtectedHeader(header)
        .setSubject(subject)
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt(nowSeconds)
        .setExpirationTime(nowSeconds + accessTtlSeconds)
        .sign(signing.signKey)

      return { token, expiresInSeconds: accessTtlSeconds }
    },

    async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
      try {
        const { payload } = await jwtVerify(token, signing.verifyKey, {
          algorithms: [signing.alg],
          issuer,
          audience,
        })
        return toClaims(payload)
      } catch {
        return null
      }
    },

    jwks() {
      return signing.jwks
    },
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function toClaims(payload: JWTPayload): AccessTokenClaims | null {
  // Pina o TIPO do token: só `typ: 'access'` vale como access token. Hoje é o
  // único JWT emitido, mas qualquer tipo futuro (ex.: verificação de e-mail)
  // assinado pela mesma chave NÃO pode ser replayado como access token.
  if (payload.typ !== 'access') return null
  const sub = asString(payload.sub)
  const email = asString(payload.email)
  const firstName = asString(payload.firstName)
  const lastName = asString(payload.lastName)
  const role = asString(payload.role)
  const status = asString(payload.status)
  if (!sub || !email || !firstName || !lastName || !role || !status) return null

  return {
    sub,
    email,
    firstName,
    lastName,
    role,
    status,
    phone: asString(payload.phone),
    signupSource: asString(payload.signupSource),
    act: toActClaim(payload.act),
    pfl: toProfileClaim(payload.pfl),
  }
}

function toActClaim(value: unknown): ActClaim | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Record<string, unknown>
  const sub = asString(candidate.sub)
  if (!sub) return undefined
  return { sub, email: asString(candidate.email), name: asString(candidate.name) }
}

function toProfileClaim(value: unknown): ProfileClaim | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Record<string, unknown>
  const accountId = asString(candidate.accountId)
  if (!accountId) return undefined
  return { accountId, name: asString(candidate.name) }
}
