import { randomBytes, randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { TokenIssuer } from '../../domain/ports/token-issuer.port'
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
}

export interface AuthTokenServiceOptions {
  refreshTtlDays: number
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
    const { token: accessToken, expiresInSeconds } = await this.tokenIssuer.issueAccessToken(user)

    const refreshExpiresIn = this.opts.refreshTtlDays * 24 * 60 * 60
    const refreshToken = randomBytes(32).toString('base64url')
    await this.refreshTokens.create({
      id: randomUUID(),
      userId: user.id,
      familyId,
      tokenHash: sha256Hex(refreshToken),
      expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      userAgent: ctx.userAgent ?? null,
      ip: ctx.ip ?? null,
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
