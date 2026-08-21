import { randomBytes, randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { ActClaim, ProfileClaim, TokenIssuer } from '../../domain/ports/token-issuer.port'
import type { UserAggregate } from '../../domain/user/user.aggregate'
import { InvalidRefreshTokenError } from '../../domain/user/user.errors'

/** Access token independente; usado ao mudar capacidade sem rotacionar o refresh. */
export interface AuthAccessToken {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

/** Access novo acompanhado do TTL restante da sessão já existente. */
export interface AuthSessionAccessToken extends AuthAccessToken {
  refreshExpiresIn: number
}

/** Par de tokens devolvido ao cliente. O refresh é opaco (guardado só como hash). */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  /** TTL do access token (segundos). */
  expiresIn: number
  /** TTL do refresh token (segundos). */
  refreshExpiresIn: number
}

export interface IssueContext {
  userAgent?: string | null
  ip?: string | null
  /** Estado coeso: não é possível informar ator sem claim (ou vice-versa). */
  impersonation?: {
    actorId: string
    act: ActClaim
    /** Deadline absoluto da família, preservado durante rotações. */
    familyExpiresAt?: Date
  } | null
  /** Estado coeso: id e claim do perfil sempre viajam juntos. */
  profile?: { profileId: string; claim: ProfileClaim } | null
}

export interface AuthTokenServiceOptions {
  refreshTtlDays: number
  /**
   * TTL do refresh de sessões IMPERSONADAS (curto — sessão de suporte morre
   * sozinha). A rotação recalcula pelo flag da família: nunca estica de volta
   * para `refreshTtlDays`.
   */
  impersonationRefreshTtlSeconds: number
}

/**
 * Orquestra a emissão de access + refresh. O access é assinado pelo `TokenIssuer`
 * (JWT) e o refresh é um valor opaco aleatório persistido apenas como sha256.
 */
export class AuthTokenService {
  constructor(
    private readonly tokenIssuer: TokenIssuer,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly opts: AuthTokenServiceOptions,
  ) {}

  /** Login/registro: emite tokens iniciando uma NOVA família de refresh. */
  issueForUser(user: UserAggregate, ctx: IssueContext = {}): Promise<AuthTokens> {
    return this.issue(user, randomUUID(), ctx)
  }

  /** Rotação (/refresh): emite novos tokens REUSANDO a família do token anterior. */
  rotate(user: UserAggregate, familyId: string, ctx: IssueContext = {}): Promise<AuthTokens> {
    return this.issue(user, familyId, ctx)
  }

  /** Reemite somente o access token; não consome nem substitui o refresh atual. */
  async issueAccessForUser(user: UserAggregate, ctx: IssueContext = {}): Promise<AuthAccessToken> {
    const profile = ctx.profile
    const act = ctx.impersonation?.act
      ? {
          ...ctx.impersonation.act,
          mode: ctx.impersonation.act.mode === 'write' ? ('write' as const) : ('readonly' as const),
        }
      : undefined
    const issued = await this.tokenIssuer.issueAccessToken(user, {
      act,
      profile: profile
        ? {
            profileId: profile.profileId,
            accountId: profile.claim.accountId,
            name: profile.claim.name,
            pub: profile.claim.pub,
          }
        : undefined,
    })
    return {
      accessToken: issued.token,
      tokenType: 'Bearer',
      expiresIn: issued.expiresInSeconds,
    }
  }

  private async issue(
    user: UserAggregate,
    familyId: string,
    ctx: IssueContext,
  ): Promise<AuthTokens> {
    const access = await this.issueAccessForUser(user, ctx)
    const now = Date.now()
    const familyExpiresAt = ctx.impersonation?.familyExpiresAt
      ? ctx.impersonation.familyExpiresAt
      : new Date(
          now +
            (ctx.impersonation
              ? this.opts.impersonationRefreshTtlSeconds
              : this.opts.refreshTtlDays * 24 * 60 * 60) *
              1000,
        )
    const refreshExpiresIn = Math.max(1, Math.ceil((familyExpiresAt.getTime() - now) / 1000))
    const refreshToken = randomBytes(32).toString('base64url')
    const created = await this.refreshTokens.create({
      id: randomUUID(),
      userId: user.id,
      familyId,
      tokenHash: sha256Hex(refreshToken),
      expiresAt: familyExpiresAt,
      userAgent: ctx.userAgent ?? null,
      ip: ctx.ip ?? null,
      impersonatorUserId: ctx.impersonation?.actorId ?? null,
      impersonationWritable: ctx.impersonation?.act.mode === 'write',
      activeProfileId: ctx.profile?.profileId ?? null,
    })
    if (!created) throw new InvalidRefreshTokenError()

    return {
      ...access,
      refreshToken,
      refreshExpiresIn,
    }
  }
}
