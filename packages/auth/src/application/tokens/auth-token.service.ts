import { randomBytes, randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { ActClaim, TokenIssuer } from '../../domain/ports/token-issuer.port'
import type { UserAggregate } from '../../domain/user/user.aggregate'

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
  /**
   * Sessão de IMPERSONAÇÃO: id do admin navegando como o usuário. Persiste na
   * FAMÍLIA de refresh (a rotação re-deriva `act` e o TTL curto a partir dele).
   */
  impersonatorUserId?: string | null
  /** Claim `act` do access token (dados do ATOR p/ exibição). Acompanha o id acima. */
  impersonatorAct?: ActClaim | null
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

  private async issue(
    user: UserAggregate,
    familyId: string,
    ctx: IssueContext,
  ): Promise<AuthTokens> {
    const impersonating = ctx.impersonatorUserId != null
    const { token: accessToken, expiresInSeconds } = await this.tokenIssuer.issueAccessToken(
      user,
      ctx.impersonatorAct ?? undefined,
    )

    const refreshExpiresIn = impersonating
      ? this.opts.impersonationRefreshTtlSeconds
      : this.opts.refreshTtlDays * 24 * 60 * 60
    const refreshToken = randomBytes(32).toString('base64url')
    await this.refreshTokens.create({
      id: randomUUID(),
      userId: user.id,
      familyId,
      tokenHash: sha256Hex(refreshToken),
      expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      userAgent: ctx.userAgent ?? null,
      ip: ctx.ip ?? null,
      impersonatorUserId: ctx.impersonatorUserId ?? null,
    })

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
      refreshExpiresIn,
    }
  }
}
