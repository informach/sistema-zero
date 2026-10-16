import { parseDesktopSessionClaim, parseKidsSessionClaim } from '@sistemazero/core/security'
import { type JWTPayload, jwtVerify, SignJWT } from 'jose'
import type {
  AccessTokenClaims,
  ActClaim,
  IssueAccessTokenOptions,
  ProfileClaim,
  TokenIssuer,
} from '../../domain/ports/token-issuer.port'
import type { UserAggregate } from '../../domain/user/user.aggregate'
import { isPrivilegedUserRole } from '../../domain/user/user.role'
import type { SigningMaterial } from './keys'

export interface JoseTokenIssuerOptions {
  validateDesktopSession?: (claims: AccessTokenClaims) => Promise<boolean>
  validateKidsSession?: (claims: AccessTokenClaims) => Promise<boolean>
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
      const student = opts?.kids?.kind === 'student'
      const claims: Record<string, unknown> = {
        // A equipe conserva o papel também como aluno (cria e testa os jogos pelos perfis
        // antes das crianças clientes); o Gateway segue barrando admin/financeiro/área dos
        // pais para QUALQUER aluno, pelo contexto `kids`, não pelo papel.
        role: student && !isPrivilegedUserRole(user.role) ? 'customer' : user.role,
        status: user.status,
        typ: 'access',
      }
      // ⚠️ O token do ALUNO não carrega e-mail, telefone nem nome do RESPONSÁVEL: o JWT fica
      // no navegador da criança. Quem precisa do nome dela usa `pfl.name`.
      if (!student) {
        claims.email = user.email
        claims.firstName = user.firstName
        claims.lastName = user.lastName
        if (user.phone) claims.phone = user.phone
        if (user.signupSource) claims.signupSource = user.signupSource
      }
      if (opts?.kids) {
        if (opts.act || (opts.kids.kind === 'student') !== Boolean(opts.profile))
          throw new Error('Contexto Kids incompatível com o perfil')
        claims.kids = opts.kids
      }
      if (opts?.desktop) {
        if (opts.kids || opts.act || opts.profile || !parseDesktopSessionClaim(opts.desktop))
          throw new Error('Contexto desktop incompatível')
        claims.desktop = opts.desktop
      }
      // Impersonação (RFC 8693): `sub` = alvo; `act.sub` = admin navegando como ele.
      if (opts?.act) {
        claims.act = {
          ...opts.act,
          mode: opts.act.mode === 'write' ? 'write' : 'readonly',
        }
      }
      // Sessão de perfil: `sub` = profileId; `pfl.accountId` = conta (x-auth-account-id).
      // A identidade/role/status seguem do `user` (a CONTA) — o perfil só herda.
      if (opts?.profile) {
        const pfl: ProfileClaim = { accountId: opts.profile.accountId }
        if (opts.profile.name) pfl.name = opts.profile.name
        // Sempre booleano numa sessão de perfil → o gateway injeta o header definido.
        pfl.pub = opts.profile.pub === true
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
      let claims: AccessTokenClaims | null
      try {
        const { payload } = await jwtVerify(token, signing.verifyKey, {
          algorithms: [signing.alg],
          issuer,
          audience,
        })
        claims = toClaims(payload)
      } catch {
        return null
      }
      // Falha da infraestrutura não significa revogação. A borda HTTP deve
      // devolver erro retentável, mantendo fechada a autorização desta chamada.
      if (claims?.kids && !(await opts.validateKidsSession?.(claims))) return null
      if (claims?.desktop && !(await opts.validateDesktopSession?.(claims))) return null
      return claims
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
  const kids = parseKidsSessionClaim(payload.kids)
  const desktop = parseDesktopSessionClaim(payload.desktop)
  if (payload.desktop !== undefined && (!desktop || payload.kids || payload.act || payload.pfl))
    return null
  if (payload.kids !== undefined && !kids) return null
  const pfl = toProfileClaim(payload.pfl)
  if (kids && ((kids.kind === 'student') !== Boolean(pfl) || payload.act)) return null
  // O aluno não traz a identidade do responsável (ver `issueAccessToken`): os campos ficam
  // vazios aqui e ninguém no Auth os lê numa sessão de aluno.
  const student = kids?.kind === 'student'
  if (!sub || !role || !status || (!student && (!email || !firstName || !lastName))) return null

  return {
    sub,
    email: email ?? '',
    firstName: firstName ?? '',
    lastName: lastName ?? '',
    role,
    status,
    phone: student ? undefined : asString(payload.phone),
    signupSource: student ? undefined : asString(payload.signupSource),
    act: toActClaim(payload.act),
    pfl,
    ...(kids ? { kids } : {}),
    ...(desktop ? { desktop } : {}),
  }
}

function toActClaim(value: unknown): ActClaim | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Record<string, unknown>
  const sub = asString(candidate.sub)
  if (!sub) return undefined
  return {
    sub,
    email: asString(candidate.email),
    name: asString(candidate.name),
    mode: candidate.mode === 'write' ? 'write' : 'readonly',
  }
}

function toProfileClaim(value: unknown): ProfileClaim | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Record<string, unknown>
  const accountId = asString(candidate.accountId)
  if (!accountId) return undefined
  return { accountId, name: asString(candidate.name), pub: candidate.pub === true }
}
