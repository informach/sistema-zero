import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { InvalidRefreshTokenError, UserNotActiveError } from '../../domain/user/user.errors'
import type { AuthTokenService, AuthTokens } from '../tokens/auth-token.service'

export interface RefreshCommand {
  refreshToken: string
  userAgent?: string | null
  ip?: string | null
}

/**
 * Caso de uso de renovação (rotação) de tokens. Detecta REUSO: se um refresh já
 * rotacionado/revogado for apresentado, revoga a família inteira (mitiga roubo).
 */
export class RefreshService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: AuthTokenService,
    private readonly logger: Logger,
  ) {}

  async execute(command: RefreshCommand): Promise<AuthTokens> {
    const presented = command.refreshToken?.trim()
    if (!presented) throw new InvalidRefreshTokenError()

    const record = await this.refreshTokens.findByHash(sha256Hex(presented))
    if (!record) throw new InvalidRefreshTokenError()

    // Reuse-detection: um token já consumido (rotacionado) ou revogado reaparecendo
    // indica vazamento → revoga a família inteira e nega.
    if (record.rotatedAt || record.revokedAt) {
      await this.refreshTokens.revokeFamily(record.familyId)
      this.logger.warn('auth.refresh.reuse_detected', {
        userId: record.userId,
        familyId: record.familyId,
      })
      throw new InvalidRefreshTokenError()
    }

    if (record.expiresAt.getTime() <= Date.now()) throw new InvalidRefreshTokenError()

    const user = await this.users.findById(record.userId)
    if (!user) throw new InvalidRefreshTokenError()
    if (!user.isActive()) throw new UserNotActiveError()

    // Rotaciona: consome o token atual e emite um novo na MESMA família.
    await this.refreshTokens.markRotated(record.id, new Date())
    return this.tokens.rotate(user, record.familyId, {
      userAgent: command.userAgent,
      ip: command.ip,
    })
  }
}
