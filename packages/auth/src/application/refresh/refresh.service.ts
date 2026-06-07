import type { Logger } from '@sistemazero/core/logging'
import { sha256Hex } from '@sistemazero/core/security'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { ActClaim } from '../../domain/ports/token-issuer.port'
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

    // Reuse-detection (fast-path): um token já consumido (rotacionado) ou revogado
    // reaparecendo indica vazamento → revoga a família inteira e nega.
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

    // Sessão de IMPERSONAÇÃO: re-deriva a claim `act` do ATOR a cada rotação
    // (o access é re-emitido do UserAggregate do ALVO e a perderia). Ator sumido
    // ou desativado → a sessão de suporte morre junto (revoga a família).
    let act: ActClaim | undefined
    if (record.impersonatorUserId) {
      const actor = await this.users.findById(record.impersonatorUserId)
      if (!actor?.isActive()) {
        await this.refreshTokens.revokeFamily(record.familyId)
        this.logger.warn('auth.impersonation.actor_gone', {
          userId: record.userId,
          actorId: record.impersonatorUserId,
          familyId: record.familyId,
        })
        throw new InvalidRefreshTokenError()
      }
      act = { sub: actor.id, email: actor.email, name: actor.fullName }
    }

    // Rotaciona com claim ATÔMICO: consome o token atual e emite um novo na MESMA
    // família. Perder o claim = outra requisição rotacionou este token entre o
    // findByHash e aqui — semanticamente é REUSO (o fast-path acima não enxerga a
    // corrida), então recebe o mesmo tratamento: revoga a família e nega.
    const claimed = await this.refreshTokens.claimForRotation(record.id, new Date())
    if (!claimed) {
      await this.refreshTokens.revokeFamily(record.familyId)
      this.logger.warn('auth.refresh.reuse_detected', {
        userId: record.userId,
        familyId: record.familyId,
        race: true,
      })
      throw new InvalidRefreshTokenError()
    }
    return this.tokens.rotate(user, record.familyId, {
      userAgent: command.userAgent,
      ip: command.ip,
      impersonatorUserId: record.impersonatorUserId,
      impersonatorAct: act ?? null,
    })
  }
}
